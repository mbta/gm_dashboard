"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import maplibregl from "maplibre-gl";

interface ZoomControlsProps {
  map: maplibregl.Map | null;
}

export default function ZoomControls({ map }: ZoomControlsProps) {
  const [zoomLevel, setZoomLevel] = useState(11);
  const [isHovered, setIsHovered] = useState(false);
  const initialZoomRef = useRef(11); // Store initial zoom in a ref

  useEffect(() => {
    if (!map) return;

    // Use ref for initial zoom instead of state
    const initialZoom = map.getZoom() || initialZoomRef.current;
    map.setZoom(initialZoom);
    setZoomLevel(initialZoom);

    const updateZoom = () => setZoomLevel(map.getZoom());

    // Listen for zoom changes
    map.on("zoom", updateZoom);

    return () => {
      map.off("zoom", updateZoom);
    };
  }, [map]); // Clean dependency array

  const handleZoomIn = () => {
    if (map) {
      map.zoomTo(map.getZoom() + 0.5); // Increase zoom increment
    }
  };

  const handleZoomOut = () => {
    if (map) {
      map.zoomTo(map.getZoom() - 0.5); // Increase zoom decrement
    }
  };

  return (
    <div 
      className="flex flex-col items-center gap-2 p-3 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap">
          Zoom: {zoomLevel.toFixed(1)}
        </div>
      )}

      {/* Zoom In Button */}
      <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-white hover:bg-gray-700">
        <Plus className="w-10 h-10" />
      </Button>
      
      <div className="w-full h-[1px] bg-gray-500" />

      {/* Zoom Out Button */}
      <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-white hover:bg-gray-700">
        <Minus className="w-10 h-10" />
      </Button>
    </div>
  );
}
