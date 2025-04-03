"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";

const MBTA_API_BASE_URL = "https://api-v3.mbta.com";
const MBTA_VEHICLE_ICON_URL = "https://www.mbta.com/icon-svg/icon-vehicle-bordered-expanded.svg";
const MBTA_API_KEY = '5f65d62484e44ee39b5058da442b7279';

interface LiveBusMarkersProps {
  map: maplibregl.Map | null;
  activeFilters: { [key: string]: boolean };
}

interface BusAttributes {
  latitude: number;
  longitude: number;
  label: string;
  bearing: number;
  updated_at: string;
  direction_id?: number;
  destination?: string;
  current_status?: string;
}

interface BusData {
  id: string;
  attributes: BusAttributes;
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

// Update FREQUENT_BUS_ROUTES to match actual MBTA route IDs
const FREQUENT_BUS_ROUTES = [
  '741', '742', '743', '746', '749', '751',  // Silver Line (SL1, SL2, SL3, SL4, SL5, SLW)
  '1', '15', '22', '23', '28', '32',   // High frequency routes
  '39', '57', '66', '71', '73', '77', '104', '109', '110', '111', '116'
];

// Add route ID mapping
const ROUTE_ID_TO_FILTER = {
  '741': 'Silver', // SL1
  '742': 'Silver', // SL2
  '743': 'Silver', // SL3
  '746': 'Silver', // SL4
  '749': 'Silver', // SL5
  '751': 'Silver', // SLW
  // All other routes map to Yellow
  '1': 'Yellow',
  '15': 'Yellow',
  '22': 'Yellow',
  '23': 'Yellow',
  '28': 'Yellow',
  '32': 'Yellow',
  '39': 'Yellow',
  '57': 'Yellow',
  '66': 'Yellow',
  '71': 'Yellow',
  '73': 'Yellow',
  '77': 'Yellow',
  '104': 'Yellow',
  '109': 'Yellow',
  '110': 'Yellow',
  '111': 'Yellow',
  '116': 'Yellow'
} as const;

// Add route display name mapping
const ROUTE_DISPLAY_NAMES = {
  '741': 'SL1',
  '742': 'SL2',
  '743': 'SL3',
  '746': 'SL4',
  '749': 'SL5',
  '751': 'SLW'
} as const;

// function getDirectionName(routeLine: string, directionId?: number): string {
//   if (directionId === undefined) return 'Unknown';
//   const direction = Number(directionId);
//   if (routeLine === 'Red' || routeLine === 'Orange') {
//     return direction === 0 ? 'Southbound' : 'Northbound';
//   }
//   if (routeLine === 'Blue' || routeLine.startsWith('Green')) {
//     return direction === 0 ? 'Westbound' : 'Eastbound';
//   }
//   if (routeLine === 'Mattapan' || routeLine.startsWith('CR-')) {
//     return direction === 0 ? 'Outbound' : 'Inbound';
//   }
//   return direction === 0 ? 'Outbound' : 'Inbound';
// }

export default function LiveBusMarkers({ map, activeFilters }: LiveBusMarkersProps) {
  const busMarkers = useRef(
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

  function getDestination(bus: BusData): string {
    if (bus.attributes.destination) {
      return bus.attributes.destination;
    }
    if (bus.relationships?.stop?.data?.id) {
      const stopId = bus.relationships.stop.data.id;
      return globalStopCache.get(stopId) || stopId;
    }
    return 'Unknown';
  }

  const clearAllMarkers = () => {
    // Store visibility states before clearing
    busMarkers.current.forEach(({ route, visible }) => {
      visibilityStates.current.set(route, visible);
    });

    busMarkers.current.forEach(({ marker, tooltip }) => {
      marker.remove();
      tooltip.remove();
    });
    busMarkers.current.clear();
  };

  const updateBusMarker = useCallback((bus: BusData, currentFilters: { [key: string]: boolean }) => {
    const busId = bus.id;
    const routeId = bus.relationships.route.data.id;
    const { 
      latitude, longitude, label, bearing, updated_at,
      direction_id, current_status
    } = bus.attributes;

    if (!latitude || !longitude) return;

    const lastPingAge = Math.round((Date.now() - new Date(updated_at).getTime()) / 1000);
    // const direction = getDirectionName(routeId, direction_id);
    const destination = getDestination(bus);

    const displayRoute = ROUTE_DISPLAY_NAMES[routeId as keyof typeof ROUTE_DISPLAY_NAMES] || routeId;
    const busDetails = 
      `Bus No: ${label}
       Route: ${displayRoute}
       Destination: ${destination}
       Status: ${current_status || 'Unknown'}
       Last Ping: ${lastPingAge}s ago`;
        //  `Bus No: ${label}
        //  Route: ${routeId}
        //  Direction: ${direction}
        //  Destination: ${destination}
        //  Status: ${current_status || 'Unknown'}
        //  Last Ping: ${lastPingAge}s ago`;

    if (busMarkers.current.has(busId)) {
      const existingMarker = busMarkers.current.get(busId)!;
      existingMarker.marker.setLngLat([longitude, latitude]).setRotation(bearing);
      existingMarker.tooltip.innerText = busDetails;
      existingMarker.marker.getElement().style.display = existingMarker.visible ? "block" : "none";
    } else {
      // Create new marker
      const customMarkerElement = document.createElement("div");
      customMarkerElement.style.backgroundImage = `url(${MBTA_VEHICLE_ICON_URL})`;
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
      tooltip.innerText = busDetails;

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
      const filterKey = ROUTE_ID_TO_FILTER[routeId as keyof typeof ROUTE_ID_TO_FILTER] || 'Yellow';
      const isVisible = currentFilters[filterKey] && currentFilters['bus'];
      marker.getElement().style.display = isVisible ? "block" : "none";

      map!.getCanvas().parentElement?.appendChild(tooltip);

      marker.getElement().addEventListener("mousemove", (event) => {
        tooltip.style.left = `${event.clientX - 60}px`;
        tooltip.style.top = `${event.clientY - 260}px`;
      });

      busMarkers.current.set(busId, { 
        marker, 
        route: routeId, 
        visible: isVisible, 
        tooltip 
      });
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    console.log("✅ Setting up SSE connection for live bus data");
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
                `${MBTA_API_BASE_URL}/vehicles?filter[route_type]=3&api_key=${MBTA_API_KEY}`
            );

            // Handle connection open
            eventSource.onopen = () => {
                console.log('Stream connection established, monitoring updates...');
            };

            // Handle events
            eventSource.addEventListener('reset', (event: MessageEvent) => {
                try {
                    const jsonData: BusData[] = JSON.parse(event.data);
                    busMarkers.current.clear();
                    if (Array.isArray(jsonData)) {
                        jsonData
                            .filter(bus => FREQUENT_BUS_ROUTES.includes(bus.relationships.route.data.id))
                            .forEach(bus => updateBusMarker(bus, latestFilters.current));
                    }
                } catch (e) {
                    console.error('Error parsing reset data:', e);
                }
            });

            eventSource.addEventListener('update', (event: MessageEvent) => {
                try {
                    const jsonData: BusData = JSON.parse(event.data);
                    if (jsonData.id && FREQUENT_BUS_ROUTES.includes(jsonData.relationships.route.data.id)) {
                        updateBusMarker(jsonData, latestFilters.current);
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
}, [map, updateBusMarker]);

  // Update visibility states when filters change
  useEffect(() => {
    if (!map) return;

    busMarkers.current.forEach(({ marker, route, tooltip }, busId) => {
      const filterKey = ROUTE_ID_TO_FILTER[route as keyof typeof ROUTE_ID_TO_FILTER] || 'Yellow';
      const isVisible = activeFilters[filterKey] && activeFilters['bus'];
      
      if (isVisible) {
        marker.getElement().style.display = "block";
        busMarkers.current.set(busId, { marker, route, visible: true, tooltip });
      } else {
        marker.getElement().style.display = "none";
        busMarkers.current.set(busId, { marker, route, visible: false, tooltip });
      }
    });
  }, [activeFilters, map]);

  return null;
}