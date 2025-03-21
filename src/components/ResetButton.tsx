"use client";

import { Button } from "@/components/ui/button";
import maplibregl from "maplibre-gl";
import { LocateFixed } from "lucide-react";

// Default map settings
const DEFAULT_CENTER: [number, number] = [-71.0589, 42.3601];
const DEFAULT_ZOOM = 11;

interface ResetButtonProps {
  mapInstance: maplibregl.Map | null;
}

export default function ResetButton({ mapInstance } : ResetButtonProps) {
  const resetMap = () => {
    if (!mapInstance) return; 
    mapInstance.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
  };

  return (
    <Button
      className="absolute top-52 right-4 z-10 bg-black text-white p-2 rounded-full shadow-md hover:bg-gray-800 transition w-14 h-14"
      onClick={resetMap}
      size="icon"
    >
      <LocateFixed style={{ width: "32px", height: "32px"}} />
    </Button>
  );
};
