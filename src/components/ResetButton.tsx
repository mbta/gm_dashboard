"use client";

import { Button } from "@/components/ui/button";
import { MutableRefObject } from "react";
import maplibregl from "maplibre-gl";

// Default map settings
const DEFAULT_CENTER: [number, number] = [-71.076639, 42.34268];
const DEFAULT_ZOOM = 12;

interface ResetButtonProps {
  mapInstance: MutableRefObject<maplibregl.Map | null>;
}

const ResetButton: React.FC<ResetButtonProps> = ({ mapInstance }) => {
  const resetMap = () => {
    if (mapInstance.current) {
      mapInstance.current.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    }
  };

  return (
    <Button
      className="absolute top-52 right-4 z-10 bg-black text-white px-4 py-2 rounded-md shadow-md hover:bg-gray-800 transition"
      onClick={resetMap}
    >
      Recenter
    </Button>
  );
};

export default ResetButton;
