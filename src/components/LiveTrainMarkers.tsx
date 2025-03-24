"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

const MBTA_API_BASE_URL = "https://api-v3.mbta.com";
const MBTA_TRAIN_ICON_URL = "https://www.mbta.com/icon-svg/icon-vehicle-bordered-expanded.svg";
const MBTA_API_KEY = '5f65d62484e44ee39b5058da442b7279';

interface LiveTrainMarkersProps {
  map: maplibregl.Map | null;
  activeFilters: { [key: string]: boolean };
}

interface TrainAttributes {
  latitude: number;
  longitude: number;
  label: string;
  bearing: number;
  carriages?: { label: string }[];
  updated_at: string;
  direction_id?: number;
  destination?: string;
  current_status?: string;
}

interface TrainData {
  id: string;
  attributes: TrainAttributes;
  relationships: {
    route: { data: { id: string } };
    stop?: { 
      data?: { 
        id: string 
      } 
    };
  };
}

interface TrainAPIResponse {
  data: TrainData[];
}

interface Stop {
  id: string;
  attributes: {
    name: string;
  };
}

function getDirectionName(routeLine: string, directionId?: number): string {
  if (directionId === undefined) return 'Unknown';
  const direction = Number(directionId);
  if (routeLine === 'Red' || routeLine === 'Orange') {
    return direction === 0 ? 'Southbound' : 'Northbound';
  }
  if (routeLine === 'Blue' || routeLine.startsWith('Green')) {
    return direction === 0 ? 'Westbound' : 'Eastbound';
  }
  if (routeLine === 'Mattapan' || routeLine.startsWith('CR-')) {
    return direction === 0 ? 'Outbound' : 'Inbound';
  }
  return direction === 0 ? 'Outbound' : 'Inbound';
}

export default function LiveTrainMarkers({ map, activeFilters }: LiveTrainMarkersProps) {
  const trainMarkers = useRef(
    new Map<
      string,
      {
        marker: maplibregl.Marker;
        route: string;
        visible: boolean;
        tooltip: HTMLDivElement;
      }
    >()
  );

  const stopNameCache = useRef(new Map<string, string>());

  function getDestination(train: TrainData): string {
    if (train.attributes.destination) {
      return train.attributes.destination;
    }
    if (train.relationships?.stop?.data?.id) {
      const stopId = train.relationships.stop.data.id;
      return stopNameCache.current.get(stopId) || stopId;
    }
    return 'Unknown';
  }

  const fetchStops = async () => {
    try {
      const response = await fetch(
        `${MBTA_API_BASE_URL}/stops`,
        {
          headers: {
            'x-api-key': MBTA_API_KEY
          }
        }
      );
      const data = await response.json();
      data.data.forEach((stop: Stop) => {
        stopNameCache.current.set(stop.id, stop.attributes.name);
      });
    } catch (error) {
      console.error('Error fetching stops:', error);
    }
  };

  const updateTrainMarker = (train: TrainData) => {
    const trainId = train.id;
    const routeId = train.relationships.route.data.id;
    const { 
      latitude, longitude, label, bearing, carriages, updated_at,
      direction_id, current_status
    } = train.attributes;

    if (!latitude || !longitude) return;

    const lastPingAge = Math.round((Date.now() - new Date(updated_at).getTime()) / 1000);
    const carCount = carriages ? carriages.length : "N/A";
    const consist = carriages ? carriages.map(c => c.label).join(", ") : "No data";
    const direction = getDirectionName(routeId, direction_id);
    const destination = getDestination(train);

    const trainDetails = routeId.includes("CR-") 
      ? `Car: ${label}
         Route: ${routeId}
         Direction: ${direction}
         Destination: ${destination}
         Status: ${current_status || 'Unknown'}
         Last Ping: ${lastPingAge}s ago`
      : `Lead Car: ${label}
         Route: ${routeId}
         Direction: ${direction}
         Destination: ${destination}
         Status: ${current_status || 'Unknown'}
         Cars: ${carCount}
         Consist: ${consist}
         Last Ping: ${lastPingAge}s ago`;

    if (trainMarkers.current.has(trainId)) {
      // Update existing marker
      const existingMarker = trainMarkers.current.get(trainId)!;
      existingMarker.marker.setLngLat([longitude, latitude]).setRotation(bearing);
      existingMarker.tooltip.innerText = trainDetails;
    } else {
      // Create new marker
      const customMarkerElement = document.createElement("div");
      customMarkerElement.style.backgroundImage = `url(${MBTA_TRAIN_ICON_URL})`;
      customMarkerElement.style.backgroundSize = "contain";
      customMarkerElement.style.width = "16px";
      customMarkerElement.style.height = "16px";
      customMarkerElement.style.cursor = "pointer";

      const tooltip = document.createElement("div");
      tooltip.className = "train-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.background = "rgba(0, 0, 0, 0.75)";
      tooltip.style.color = "white";
      tooltip.style.padding = "4px 8px";
      tooltip.style.borderRadius = "4px";
      tooltip.style.fontSize = "12px";
      tooltip.style.whiteSpace = "nowrap";
      tooltip.style.visibility = "hidden";
      tooltip.style.zIndex = "10";
      tooltip.innerText = trainDetails;

      customMarkerElement.addEventListener("mouseenter", () => {
        tooltip.style.visibility = "visible";
      });

      customMarkerElement.addEventListener("mouseleave", () => {
        tooltip.style.visibility = "hidden";
      });

      const marker = new maplibregl.Marker({ element: customMarkerElement })
        .setLngLat([longitude, latitude])
        .setRotation(bearing)
        .addTo(map!);

      map!.getCanvas().parentElement?.appendChild(tooltip);

      marker.getElement().addEventListener("mousemove", (event) => {
        tooltip.style.left = `${event.clientX - 60}px`;
        tooltip.style.top = `${event.clientY - 260}px`;
      });

      trainMarkers.current.set(trainId, { 
        marker, 
        route: routeId, 
        visible: activeFilters[routeId] ?? true, 
        tooltip 
      });
    }
  };

  useEffect(() => {
    if (!map) return;

    console.log("✅ Setting up SSE connection for live train data");
    let isActive = true;

    const setupSSE = async () => {
      // Pre-fetch stops data before setting up the stream
      await fetchStops();
      
      while (isActive) {
        try {
          // First fetch initial state
          const response = await fetch(
            `${MBTA_API_BASE_URL}/vehicles?filter[route_type]=0,1,2`
          );

          const initialData: TrainAPIResponse = await response.json();
          initialData.data.forEach(updateTrainMarker);

          // Then set up streaming connection
          console.log('Connecting to MBTA streaming API...');
          const streamResponse = await fetch(
            `${MBTA_API_BASE_URL}/vehicles?filter[route_type]=0,1,2`,
            {
              headers: {
                'Accept': 'text/event-stream',
                'x-api-key': MBTA_API_KEY
              }
            }
          );

          if (!streamResponse.ok) {
            throw new Error(`HTTP error! status: ${streamResponse.status}`);
          }

          const reader = streamResponse.body!.getReader();
          const decoder = new TextDecoder();

          let buffer = '';
          console.log('Stream connection established, monitoring updates...');

          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                console.log('Stream ended, attempting to reconnect...');
                break;
              }

              // Process stream data...
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              let currentEvent = '';
              for (const line of lines) {
                if (line.trim()) {
                  if (line.startsWith('event:')) {
                    currentEvent = line.slice(6).trim();
                    continue;
                  }
                  if (line.startsWith('data:')) {
                    try {
                      const jsonStr = line.slice(5).trim();
                      const jsonData = JSON.parse(jsonStr);
                      if (currentEvent === 'reset') {
                        trainMarkers.current.clear();
                        if (Array.isArray(jsonData)) {
                          jsonData.forEach(updateTrainMarker);
                        }
                      } else if (currentEvent === 'update' && jsonData.id) {
                        updateTrainMarker(jsonData);
                      }
                    } catch (e) {
                      console.error('Error parsing JSON:', e);
                    }
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Wait a bit before reconnecting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err) {
          console.error("❌ Error in train tracking:", err);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    setupSSE();

    return () => {
      console.log("🛑 Cleanup: Closing SSE connection");
      isActive = false;
      trainMarkers.current.forEach(({ tooltip }) => {
        tooltip.remove();
      });
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    trainMarkers.current.forEach(({ marker, route, tooltip }, trainId) => {
      const isRouteVisible = activeFilters[route] ?? true;
      const wasPreviouslyHidden = trainMarkers.current.get(trainId)?.visible === false;

      if (isRouteVisible && wasPreviouslyHidden) {
        marker.getElement().style.display = "block";
        trainMarkers.current.set(trainId, { marker, route, visible: true, tooltip });
      } else if (!isRouteVisible) {
        marker.getElement().style.display = "none";
        trainMarkers.current.set(trainId, { marker, route, visible: false, tooltip });
      }
    });
  }, [activeFilters]);

  return null;
}
