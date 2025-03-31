"use client";

import { useEffect, useRef, useCallback } from "react";
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

interface Stop {
  id: string;
  attributes: {
    name: string;
  };
}

// Add this outside the component to persist across reconnections
const globalStopCache = new Map<string, string>();

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

  // Add a ref to store visibility states
  const visibilityStates = useRef(new Map<string, boolean>());

  // Add a ref to store latest filters
  const latestFilters = useRef(activeFilters);

  // Keep latestFilters in sync with activeFilters
  useEffect(() => {
    latestFilters.current = activeFilters;
  }, [activeFilters]);

  const fetchStops = async () => {
    // Only fetch if global cache is empty
    if (globalStopCache.size === 0) {
      try {
        const response = await fetch(
          `${MBTA_API_BASE_URL}/stops`
        );
        const data = await response.json();
        data.data.forEach((stop: Stop) => {
          globalStopCache.set(stop.id, stop.attributes.name);
        });
      } catch (error) {
        console.error('Error fetching stops:', error);
      }
    }
  };

  function getDestination(train: TrainData): string {
    if (train.attributes.destination) {
      return train.attributes.destination;
    }
    if (train.relationships?.stop?.data?.id) {
      const stopId = train.relationships.stop.data.id;
      return globalStopCache.get(stopId) || stopId;
    }
    return 'Unknown';
  }

  const clearAllMarkers = () => {
    // Store visibility states before clearing
    trainMarkers.current.forEach(({ route, visible }) => {
      visibilityStates.current.set(route, visible);
    });

    trainMarkers.current.forEach(({ marker, tooltip }) => {
      marker.remove();
      tooltip.remove();
    });
    trainMarkers.current.clear();
  };

  const updateTrainMarker = useCallback((train: TrainData, currentFilters: { [key: string]: boolean }) => {
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
      const existingMarker = trainMarkers.current.get(trainId)!;
      existingMarker.marker.setLngLat([longitude, latitude]).setRotation(bearing);
      existingMarker.tooltip.innerText = trainDetails;
      existingMarker.marker.getElement().style.display = existingMarker.visible ? "block" : "none";
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

      // Use stored visibility state for new markers
      const isVisible = visibilityStates.current.get(routeId) ?? (currentFilters[routeId] ?? true);
      marker.getElement().style.display = isVisible ? "block" : "none";

      map!.getCanvas().parentElement?.appendChild(tooltip);

      marker.getElement().addEventListener("mousemove", (event) => {
        tooltip.style.left = `${event.clientX - 60}px`;
        tooltip.style.top = `${event.clientY - 260}px`;
      });

      trainMarkers.current.set(trainId, { 
        marker, 
        route: routeId, 
        visible: isVisible, 
        tooltip 
      });
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    console.log("✅ Setting up SSE connection for live train data");
    let isActive = true;
    let eventSource: EventSource | null = null;

    const setupSSE = async () => {
        try {
            // First fetch stops data (will only fetch if cache is empty)
            await fetchStops();

            // Clear any existing markers before new connection
            clearAllMarkers();

            // Then set up streaming connection
            console.log('Connecting to MBTA streaming API...');
            eventSource = new EventSource(
                `${MBTA_API_BASE_URL}/vehicles?filter[route_type]=0,1,2&api_key=${MBTA_API_KEY}`
            );

            // Handle connection open
            eventSource.onopen = () => {
                console.log('Stream connection established, monitoring updates...');
            };

            // Handle events
            eventSource.addEventListener('reset', (event: MessageEvent) => {
                try {
                    const jsonData: TrainData[] = JSON.parse(event.data);
                    trainMarkers.current.clear();
                    if (Array.isArray(jsonData)) {
                        jsonData.forEach(train => updateTrainMarker(train, latestFilters.current));
                    }
                } catch (e) {
                    console.error('Error parsing reset data:', e);
                }
            });

            eventSource.addEventListener('update', (event: MessageEvent) => {
                try {
                    const jsonData: TrainData = JSON.parse(event.data);
                    if (jsonData.id) {
                        updateTrainMarker(jsonData, latestFilters.current);
                    }
                } catch (e) {
                    console.error('Error parsing update data:', e);
                }
            });

            // Handle errors
            eventSource.onerror = (error) => {
                console.error("❌ EventSource failed:", error);
                eventSource?.close();
                
                if (isActive) {
                    console.log('Attempting to reconnect in 5 seconds...');
                    setTimeout(setupSSE, 5000);
                }
            };

        } catch (err) {
            console.error("❌ Error in train tracking:", err);
            if (isActive) {
                setTimeout(setupSSE, 5000);
            }
        }
    };

    setupSSE();

    return () => {
        console.log("🛑 Cleanup: Closing SSE connection");
        isActive = false;
        if (eventSource) {
            eventSource.close();
        }
        clearAllMarkers();
    };
}, [map, updateTrainMarker]);

  // Update visibility states when filters change
  useEffect(() => {
    if (!map) return;

    trainMarkers.current.forEach(({ marker, route, tooltip }, trainId) => {
      const isRouteVisible = activeFilters[route] ?? true;
      visibilityStates.current.set(route, isRouteVisible);

      if (isRouteVisible) {
        marker.getElement().style.display = "block";
        trainMarkers.current.set(trainId, { marker, route, visible: true, tooltip });
      } else {
        marker.getElement().style.display = "none";
        trainMarkers.current.set(trainId, { marker, route, visible: false, tooltip });
      }
    });
  }, [activeFilters, map]);

  return null;
}