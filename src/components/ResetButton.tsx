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
  const handleReset = () => {
    if (!mapInstance) return;
    
    mapInstance.flyTo({
      center: DEFAULT_CENTER,
      zoom: 11,
      bearing: 0,
      pitch: 0
    });
  };

  return (
    <Button
      className="text-white p-2 hover:bg-gray-800 transition w-14 h-14"
      onClick={handleReset}
      size="icon"
    >
      <LocateFixed style={{ width: "32px", height: "32px"}} />
    </Button>
  );
};
