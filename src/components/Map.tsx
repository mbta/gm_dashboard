'use client';

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ResetButton from "./ResetButton";
import TrainPaths from "./TrainPaths";
import BusPaths from "./BusPaths";
import TransitFilters from "./TransitFilters";
import LiveTrainMarkers from "./LiveTrainMarkers";
import ZoomControls from "./ZoomControls";

const DEFAULT_CENTER: [number, number] = [-71.0589, 42.3601];
const MASSACHUSETTS_BOUNDS: [[number, number], [number, number]] = [
    [-73.5081, 41.237964], // Southwest corner (Lower Left)
    [-69.9285, 42.8868],   // Northeast corner (Upper Right)
  ];

const MBTA_LINES = {
  subway: ["Red", "Orange", "Blue"],
  lightrail: ["Mattapan", "Green-B", "Green-C", "Green-D", "Green-E"],
  commuter: [
    "CR-Fairmount", "CR-Fitchburg", "CR-Worcester", "CR-Franklin", "CR-Greenbush",
    "CR-Haverhill", "CR-Kingston", "CR-Lowell", "CR-Middleborough", "CR-Needham",
    "CR-Newburyport", "CR-Providence", "CR-Foxboro", "CR-NewBedford"
  ],
  bus: ["Yellow", "Silver"]
};

const Map = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isRoutesLoaded, setIsRoutesLoaded] = useState(false);

  // ✅ Track state for individual lines and categories
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: boolean }>(() => {
    const initialState: { [key: string]: boolean } = {};
    
    // Set all train lines to visible by default
    Object.values(MBTA_LINES).flat().forEach(line => {
      // Set bus routes to false, all others to true
      initialState[line] = !["Yellow", "Silver"].includes(line);
    });
    
    // Set all categories to visible except bus
    Object.keys(MBTA_LINES).forEach(category => {
      initialState[category] = category !== "bus";
    });
    
    return initialState;
  });

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    mapInstance.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://api.maptiler.com/maps/6352c4b7-9417-48fc-b37e-a8e9154e1559/style.json?key=uAsV5el3HdBMKRqcz1p8",
      // style: "https://api.maptiler.com/maps/0195fc1d-5861-74ea-ab52-9093f35756b9/style.json?key=uAsV5el3HdBMKRqcz1p8",
      // style: "https://api.maptiler.com/maps/0195fc3a-630b-7113-9e34-fe85e7c483d6/style.json?key=uAsV5el3HdBMKRqcz1p8",
      center: DEFAULT_CENTER,
      zoom: 11,
    });

    mapInstance.current.setMaxBounds(MASSACHUSETTS_BOUNDS);
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
          <TrainPaths 
            map={mapInstance.current} 
            activeFilters={activeFilters} 
            onRoutesLoaded={() => setIsRoutesLoaded(true)}
          />
          <BusPaths 
            map={mapInstance.current} 
            activeFilters={activeFilters} 
            onRoutesLoaded={() => setIsRoutesLoaded(true)}
          />
          {/* <VehicleMarkers map={mapInstance.current} /> ✅ Overlay Vehicle Tracking */}
          { isRoutesLoaded && < LiveTrainMarkers map={mapInstance.current} activeFilters={activeFilters}/> }
        </>
      )}

      {/* Controls container with gaps */}
      <div className="absolute top-4 right-4 flex flex-col gap-4">
        <div className="bg-black rounded-lg shadow-md">
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
        </div>
        <div className="bg-black rounded-lg shadow-md">
          <ResetButton mapInstance={mapInstance.current} />
        </div>
        <div className="bg-black rounded-lg shadow-md">
          <ZoomControls map={mapInstance.current} />
        </div>
      </div>
    </div>
  );
};

export default Map;