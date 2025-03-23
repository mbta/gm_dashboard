'use client';

import { useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { decodePolyline } from '../utils/polyline';

const MBTA_API_BASE_URL = 'https://api-v3.mbta.com';

interface TrainPathsProps {
  map: maplibregl.Map | null;
  activeFilters: { [key: string]: boolean };
  onRoutesLoaded: () => void; // Ensure live locations start after routes load
}

interface Shape {
  id: string;
  type: string;
  attributes: {
    polyline: string;
    typicality?: number;
    priority?: number;
  };
  relationships?: {
    route?: {
      data: {
        id: string;
      };
    };
  };
}

interface Route {
  id: string;
  type: string;
  attributes: {
    long_name: string;
    short_name: string;
    color?: string;
    text_color?: string;
  };
}

interface RoutePattern {
  id: string;
  type: string;
  relationships: {
    representative_trip: {
      data: {
        id: string;
      };
    };
    route: {
      data: {
        id: string;
      };
    };
  };
}

interface Trip {
  id: string;
  type: string;
  relationships: {
    shape: {
      data: {
        id: string;
      };
    };
  };
}

interface ApiResponse {
  data: Route[];
  included: (Shape | RoutePattern | Trip)[];
}

export default function TrainPaths({ map, activeFilters, onRoutesLoaded }: TrainPathsProps) {
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [routeIds, setRouteIds] = useState<string[]>([]);

  const fetchAllRoutes = useCallback(async () => {
    if (!map || routesLoaded) return;

    try {
      const response = await fetch(
        `${MBTA_API_BASE_URL}/routes?include=route_patterns.representative_trip.shape&filter[type]=0,1,2`
      );

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      const apiRouteIds = data.data.map(route => route.id);
      setRouteIds(apiRouteIds);

      // Create maps for efficient lookups
      const shapesMap = new Map<string, Shape>();
      data.included.forEach(item => {
        if (item.type === 'shape' && item.id.includes('canonical')) {
          shapesMap.set(item.id, item as Shape);
        }
      });

      // Process each route
      data.data.forEach(route => {
        const routeId = route.id;
        const routeColor = `#${route.attributes.color || '888888'}`;
        
        // Find patterns for this route
        const routePatterns = data.included.filter(item =>
          item.type === 'route_pattern' &&
          (item as RoutePattern).relationships?.route?.data?.id === routeId
        ) as RoutePattern[];

        const processedShapes = new Set<string>();
        const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

        // Process each pattern's shape
        routePatterns.forEach(pattern => {
          const tripId = pattern.relationships?.representative_trip?.data?.id;
          if (!tripId) return;

          const trip = data.included.find(item =>
            item.type === 'trip' && item.id === tripId
          ) as Trip | undefined;

          const shapeId = trip?.relationships?.shape?.data?.id;
          if (shapeId && shapesMap.has(shapeId) && !processedShapes.has(shapeId)) {
            processedShapes.add(shapeId);
            const shape = shapesMap.get(shapeId)!;

            features.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: decodePolyline(shape.attributes.polyline)
              },
              properties: {
                shape_id: shapeId,
                route_color: routeColor
              }
            });
          }
        });

        if (features.length > 0) {
          const geoJson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
            type: 'FeatureCollection',
            features
          };

          const sourceId = `mbta-routes-${routeId}`;
          const layerId = `mbta-lines-${routeId}`;

          if (!map.getSource(sourceId)) {
            try {
              map.addSource(sourceId, { type: 'geojson', data: geoJson });
              map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': ['get', 'route_color'],
                  'line-width': 2
                }
              });
            } catch (error) {
              console.error(`Error adding ${routeId} to map:`, error);
            }
          }
        }
      });

      setRoutesLoaded(true);
      onRoutesLoaded();

    } catch (error) {
      console.error('Error loading routes:', error);
    }
  }, [map, routesLoaded, onRoutesLoaded]);

  useEffect(() => {
    if (!map || routesLoaded) return;

    let didCancel = false;

    const loadRoutes = async () => {
      if (didCancel) return;
      await fetchAllRoutes();
    };

    loadRoutes();

    return () => {
      didCancel = true;
    };
  }, [map, fetchAllRoutes, routesLoaded]);

  // Update visibility effect to use API route IDs
  useEffect(() => {
    if (!map) return;

    routeIds.forEach((routeId) => {
      const layerId = `mbta-lines-${routeId}`;
      if (map.getLayer(layerId)) {
        const isVisible = activeFilters[routeId] ?? true;
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
        map.setPaintProperty(layerId, 'line-opacity', isVisible ? 1 : 0.5);
      }
    });
  }, [activeFilters, map, routeIds]);

  return null;
}