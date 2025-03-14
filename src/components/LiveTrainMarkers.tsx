"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

const MBTA_API_BASE_URL = "https://api-v3.mbta.com";
const REFRESH_INTERVAL = 2500; // 2.5 seconds
const MBTA_TRAIN_ICON_URL = "https://www.mbta.com/icon-svg/icon-vehicle-bordered-expanded.svg";

interface LiveTrainMarkersProps {
  map: maplibregl.Map | null;
  activeFilters: { [key: string]: boolean };
}

interface TrainAttributes {
  latitude: number;
  longitude: number;
  label: string;
  bearing: number;
  // occupancy_status?: string;
  carriages?: { label: string }[]; 
  updated_at: string;
}

interface TrainData {
  id: string;
  attributes: TrainAttributes;
  relationships: {
    route: { data: { id: string } };
    // stop?: { data?: { id: string } };
  };
}

interface TrainAPIResponse {
  data: TrainData[];
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedData = useRef<string | null>(null);

  useEffect(() => {
    if (!map) return;

    console.log("✅ useEffect triggered (Live Train Markers)");

    const fetchLiveTrains = async () => {
      console.log(`⏳ Fetching live train data...`);

      try {
        const response = await fetch(
          `${MBTA_API_BASE_URL}/vehicles?filter[route]=Red,Blue,Orange,Mattapan,Green-B,Green-C,Green-D,Green-E,CR-Fairmount,CR-Fitchburg,CR-Worcester,CR-Franklin,CR-Greenbush,CR-Haverhill,CR-Kingston,CR-Lowell,CR-Middleborough,CR-Needham,CR-Newburyport,CR-Providence,CR-Foxboro`
        );

        if (response.status === 429) {
          console.warn(`⚠️ Rate limit hit (429). Skipping this fetch.`);
          return;
        }

        const trainData: TrainAPIResponse = await response.json();
        const dataString = JSON.stringify(trainData.data);

        if (lastFetchedData.current === dataString) {
          console.log("🔄 No change in train data. Skipping update.");
          return;
        }
        lastFetchedData.current = dataString;

        console.log(`✅ Fetch successful at ${new Date().toLocaleTimeString()}`);

        trainData.data.forEach((train) => {
          const trainId = train.id;
          const routeId = train.relationships.route.data.id;
          // const { latitude, longitude, bearing, carriages, updated_at } = train.attributes;
          const { latitude, longitude, label, bearing, carriages, updated_at } = train.attributes;
          // const destination = train.relationships.stop?.data?.id || "Unknown Destination";

          if (!latitude || !longitude) return;

          // ✅ Calculate the age of last location ping
          const lastPingAge = Math.round((Date.now() - new Date(updated_at).getTime()) / 1000);

          // ✅ Extract Train Consist Data
          const carCount = carriages ? carriages.length : "N/A";
          const consist = carriages ? carriages.map(c => c.label).join(", ") : "No data";

          const trainDetails = routeId.includes("CR-")?`Car: ${label}
            Route: ${routeId}
            Last Ping: ${lastPingAge}s ago
          `:`Lead Car: ${label}
            Route: ${routeId}
            Cars: ${carCount}
            Consist: ${consist}
            Last Ping: ${lastPingAge}s ago
          `;

          if (trainMarkers.current.has(trainId)) {
            const existingMarker = trainMarkers.current.get(trainId)!;
            existingMarker.marker.setLngLat([longitude, latitude]).setRotation(bearing);
          } else {
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
              .addTo(map);

            map.getCanvas().parentElement?.appendChild(tooltip);

            marker.getElement().addEventListener("mousemove", (event) => {
              tooltip.style.left = `${event.clientX + 10}px`; 
              tooltip.style.top = `${event.clientY - 30}px`;
            });

            trainMarkers.current.set(trainId, { marker, route: routeId, visible: activeFilters[routeId] ?? true, tooltip });
          }
        });
      } catch (err) {
        console.error(`❌ Error fetching live train locations:`, err);
      }
    };

    if (!intervalRef.current) {
      fetchLiveTrains();
      intervalRef.current = setInterval(fetchLiveTrains, REFRESH_INTERVAL);
    }

    return () => {
      console.log("🛑 Cleanup: Clearing interval ONLY ON UNMOUNT");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
        // Show the marker again
        marker.getElement().style.display = "block";
        trainMarkers.current.set(trainId, { marker, route, visible: true, tooltip });
      } else if (!isRouteVisible) {
        // Hide the marker
        marker.getElement().style.display = "none";
        trainMarkers.current.set(trainId, { marker, route, visible: false, tooltip });
}

    });

  }, [activeFilters]);

  return null;
}
