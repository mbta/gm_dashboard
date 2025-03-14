'use client';

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ResetButton from "./ResetButton";
import TrainPaths from "./TrainPaths";
import TransitFilters from "./TransitFilters";
import LiveTrainMarkers from "./LiveTrainMarkers";

const DEFAULT_CENTER: [number, number] = [-71.0589, 42.3601];

const MBTA_LINES = {
  subway: ["Red", "Orange", "Blue"],
  lightrail: ["Mattapan", "Green-B", "Green-C", "Green-D", "Green-E"],
  commuter: [
    "CR-Fairmount", "CR-Fitchburg", "CR-Worcester", "CR-Franklin", "CR-Greenbush",
    "CR-Haverhill", "CR-Kingston", "CR-Lowell", "CR-Middleborough", "CR-Needham",
    "CR-Newburyport", "CR-Providence", "CR-Foxboro"
  ]
};

const Map = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isRoutesLoaded, setIsRoutesLoaded] = useState(false);

  // ✅ Track state for individual lines and categories
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: boolean }>(() => {
    const initialState: { [key: string]: boolean } = {};
    Object.values(MBTA_LINES).flat().forEach(line => (initialState[line] = true));
    Object.keys(MBTA_LINES).forEach(category => (initialState[category] = true));
    return initialState;
  });

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    mapInstance.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://api.maptiler.com/maps/6352c4b7-9417-48fc-b37e-a8e9154e1559/style.json?key=uAsV5el3HdBMKRqcz1p8",
      center: DEFAULT_CENTER,
      zoom: 11,
    });

    mapInstance.current.on("load", () => setMapReady(true));

  }, []);

  // ✅ Toggle category (subway, lightrail, commuter)
  const toggleCategory = (category: string) => {
    const isVisible = !activeFilters[category];
    setActiveFilters(prev => {
      const newFilters = { ...prev, [category]: isVisible };
      MBTA_LINES[category as keyof typeof MBTA_LINES].forEach(line => {
        newFilters[line] = isVisible;
      });
      return newFilters;
    });
  };

  // ✅ Toggle individual line visibility
  const toggleLine = (line: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [line]: !prev[line]
    }));
  };

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />
      
      {mapReady && (
        <>
          <TrainPaths map={mapInstance.current} activeFilters={activeFilters} onRoutesLoaded={() => setIsRoutesLoaded(true)}/>
          {/* <VehicleMarkers map={mapInstance.current} /> ✅ Overlay Vehicle Tracking */}
          { isRoutesLoaded && < LiveTrainMarkers map={mapInstance.current}/> }
        </>
      )}
      <TransitFilters 
        activeFilters={activeFilters} 
        toggleCategory={toggleCategory} 
        toggleLine={toggleLine} 
        showAll={() => setActiveFilters(prev => {
          const newFilters = { ...prev };
          Object.keys(newFilters).forEach(key => newFilters[key] = true);
          return newFilters;
        })}
      />

      <ResetButton mapInstance={mapInstance.current} />
    </div>
  );
};

export default Map;
