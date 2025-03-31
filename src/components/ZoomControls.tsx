"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import maplibregl from "maplibre-gl";

interface ZoomControlsProps {
  map: maplibregl.Map | null;
}

export default function ZoomControls({ map }: ZoomControlsProps) {
  const [zoomLevel, setZoomLevel] = useState(11);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!map) return;

    // Set initial zoom only once when map is first available
    const initialZoom = map.getZoom() || zoomLevel;
    map.setZoom(initialZoom);
    setZoomLevel(initialZoom);

    const updateZoom = () => setZoomLevel(map.getZoom());

    // Listen for zoom changes
    map.on("zoom", updateZoom);

    return () => {
      map.off("zoom", updateZoom);
    };
  }, [map]); // Remove zoomLevel dependency

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
      className="absolute top-72 right-4 z-20 flex flex-col items-center gap-2 p-3 bg-black text-white rounded-lg shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div className="absolute top-0 -translate-y-full mb-1 text-xs bg-gray-800 text-white px-2 py-1 rounded">
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
