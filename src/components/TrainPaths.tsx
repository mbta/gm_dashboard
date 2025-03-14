'use client';
import { useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
const MBTA_API_BASE_URL = 'https://api-v3.mbta.com';
const MAX_RETRIES = 20;
const INITIAL_RETRY_DELAY = 500;
const MBTA_SUBWAY_LINES = ['Red', 'Orange', 'Blue'];
const MBTA_LIGHTRAIL_LINES = ['Mattapan', 'Green-B', 'Green-C', 'Green-D', 'Green-E'];
const MBTA_COMMUTER_RAIL_LINES = [
  'CR-Fairmount', 'CR-Fitchburg', 'CR-Worcester', 'CR-Franklin', 'CR-Greenbush',
  'CR-Haverhill', 'CR-Kingston', 'CR-Lowell', 'CR-Middleborough', 'CR-Needham',
  'CR-Newburyport', 'CR-Providence', 'CR-Foxboro'
];
const allLines = [...MBTA_SUBWAY_LINES, ...MBTA_LIGHTRAIL_LINES, ...MBTA_COMMUTER_RAIL_LINES];
// ✅ Define types for API responses
interface RouteAttributes {
  color?: string;
}
interface ShapeAttributes {
  polyline: string;
}
interface RouteResponse {
  data: {
    attributes: RouteAttributes;
  };
  included: { type: string; id: string; attributes: ShapeAttributes }[];
}
interface TrainPathsProps {
  map: maplibregl.Map | null;
  activeFilters: { [key: string]: boolean };
  onRoutesLoaded: () => void;
}
export default function TrainPaths({ map, activeFilters, onRoutesLoaded }: TrainPathsProps) {
//   const [isLoading, setIsLoading] = useState(true);
  // ✅ Memoized function for fetching and loading a single route
  const fetchAndLoadRoute = useCallback(async (line: string, attempt = 1) => {
    console.log(`🚆 Fetching route: ${line} (Attempt ${attempt})`);
    try {
      const response = await fetch(
        `${MBTA_API_BASE_URL}/routes/${line}?include=route_patterns.representative_trip.shape`
      );
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`⚠️ API rate limit reached for ${line}, retrying after delay...`);
          await delay(INITIAL_RETRY_DELAY * attempt);
          return fetchAndLoadRoute(line, attempt + 1);
        }
        throw new Error(`HTTP Error ${response.status}`);
      }
      // ✅ Ensure API response matches expected structure
      const routeData: RouteResponse = await response.json();
      const routeColor = `#${routeData.data.attributes.color || '888888'}`;
      // ✅ Explicitly define the type for `shapeDataArray`
      const shapeDataArray = routeData.included.filter(
        (item): item is { type: string; id: string; attributes: ShapeAttributes } => item.type === 'shape'
      );
      if (!shapeDataArray.length) {
        throw new Error(`No shape data found for ${line}`);
      }
      const mbtaGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features: shapeDataArray.map((shape) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: decodePolyline(shape.attributes.polyline) },
          properties: { shape_id: shape.id, route_color: routeColor },
        })),
      };
      const sourceId = `mbta-routes-${line}`;
      const layerId = `mbta-lines-${line}`;
      if (!map?.getSource(sourceId)) {
        map?.addSource(sourceId, { type: 'geojson', data: mbtaGeoJSON });
        map?.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ['get', 'route_color'], 'line-width': 2 },
        });
      }
      console.log(`✅ Successfully loaded route: ${line}`);
    } catch (error) {
      console.error(`❌ Error loading ${line}: ${(error as Error).message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`🔄 Retrying ${line} in ${INITIAL_RETRY_DELAY * attempt}ms...`);
        await delay(INITIAL_RETRY_DELAY * attempt);
        return fetchAndLoadRoute(line, attempt + 1);
      } else {
        console.error(`🚨 Maximum retries reached for ${line}, skipping...`);
      }
    }
  }, [map]);
  useEffect(() => {
    if (!map) return;
    console.log("✅ Map instance is ready, loading routes...");
    const loadRoutes = async () => {
      try {
        for (const line of allLines) {
          await fetchAndLoadRoute(line);
        }
        console.log("🎉 All routes loaded successfully!");
        onRoutesLoaded();
      } catch (err) {
        console.error("❌ Error loading all routes:", err);
      }
    //   finally {
    //     setIsLoading(false);
    //   }
    };
    loadRoutes();
  }, [map, fetchAndLoadRoute, onRoutesLoaded]);
  // ✅ Update visibility based on individual line filters
  useEffect(() => {
    if (!map) return;
    allLines.forEach(line => {
      const layerId = `mbta-lines-${line}`;
      if (map.getLayer(layerId)) {
        const isVisible = activeFilters[line] ?? true;
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
        map.setPaintProperty(layerId, 'line-opacity', isVisible ? 1 : 0.5);
      }
    });
  }, [activeFilters, map]);
  return null;
}
// ✅ Utility: Delay function for retries
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// ✅ Utility: Decode polyline function
function decodePolyline(encoded: string): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: [number, number][] = [];
  while (index < encoded.length) {
    let shift = 0, result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1 ? ~(result >> 1) : result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1 ? ~(result >> 1) : result >> 1);
    lng += dlng;
    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  return coordinates;
}
