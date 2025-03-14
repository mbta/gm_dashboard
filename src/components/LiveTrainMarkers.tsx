'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

const MBTA_API_BASE_URL = 'https://api-v3.mbta.com';
const REFRESH_INTERVAL = 2500; // 2.5 seconds
const MBTA_TRAIN_ICON_URL = 'https://www.mbta.com/icon-svg/icon-vehicle-bordered-expanded.svg';

interface LiveTrainMarkersProps {
  map: maplibregl.Map | null;
}

interface TrainAttributes {
    latitude: number;
    longitude: number;
    label: string;
    bearing: number;
}

interface TrainData {
    id: string;
    attributes: TrainAttributes
}

interface TrainAPIResponse {
    data: TrainData[];
}

export default function LiveTrainMarkers({ map }: LiveTrainMarkersProps) {
  const trainMarkers = useRef(new Map<string, maplibregl.Marker>());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedData = useRef<string | null>(null);

  useEffect(() => {
    if (!map) return;

    console.log("✅ useEffect triggered");

    const fetchLiveTrains = async () => {
      console.log(`⏳ Fetching live train data at ${new Date().toLocaleTimeString()}`);

      try {
        const response = await fetch(
          `${MBTA_API_BASE_URL}/vehicles?filter[route]=Red,Blue,Orange,Green-B,Green-C,Green-D,Green-E,CR-Fairmount,CR-Fitchburg,CR-Worcester,CR-Franklin,CR-Greenbush,CR-Haverhill,CR-Kingston,CR-Lowell,CR-Middleborough,CR-Needham,CR-Newburyport,CR-Providence,CR-Foxboro`
        );

        if (response.status === 429) {
          console.warn(`⚠️ Rate limit hit (429) at ${new Date().toLocaleTimeString()}. Skipping this fetch.`);
          return; // Skip this cycle and try again later
        }

        const trainData: TrainAPIResponse = await response.json();
        const dataString = JSON.stringify(trainData.data);

        // 🛑 Skip processing if data hasn't changed
        if (lastFetchedData.current === dataString) {
          console.log("🔄 No change in train data. Skipping update.");
          return;
        }
        lastFetchedData.current = dataString;

        console.log(`✅ Fetch successful at ${new Date().toLocaleTimeString()}`);

        trainData.data.forEach((train) => {
          const trainId: string = train.id as string;
          const { latitude, longitude, label, bearing } = train.attributes;
          if (!latitude || !longitude) return;

          // ✅ If marker exists, update its position
          if (trainMarkers.current.has(trainId)) {
            trainMarkers.current.get(trainId)!.setLngLat([longitude, latitude]);
          } else {
            // 🔹 Define custom marker ONCE before fetching API
            const customMarkerElement = document.createElement('div');
            customMarkerElement.style.backgroundImage = `url(${MBTA_TRAIN_ICON_URL})`;
            customMarkerElement.style.backgroundSize = 'contain';
            customMarkerElement.style.width = '16px';
            customMarkerElement.style.height = '16px';
            customMarkerElement.style.cursor = 'pointer';

            // ✅ Add custom marker to map
            const marker = new maplibregl.Marker({ element: customMarkerElement })
              .setLngLat([longitude, latitude])
              .setPopup(new maplibregl.Popup().setHTML(`<b>Train ${label}</b>`))
              .setRotation(bearing)
              .addTo(map);

            trainMarkers.current.set(trainId, marker);
          }
        });

      } catch (err) {
        console.error(`❌ Error fetching live train locations at ${new Date().toLocaleTimeString()}:`, err);
      }
    };

    // Ensure previous interval is cleared before setting a new one
    if (intervalRef.current) {
      console.log("🛑 Clearing old interval before setting a new one");
      clearInterval(intervalRef.current);
    }

    // Initial fetch
    fetchLiveTrains();

    // Set up the interval
    intervalRef.current = setInterval(fetchLiveTrains, REFRESH_INTERVAL);
    console.log(`⏲ Interval set for ${REFRESH_INTERVAL}ms`);

    return () => {
      console.log("🛑 Cleanup: Clearing interval on unmount");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [map]);

  return null;
}
