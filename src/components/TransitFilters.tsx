'use client';

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";

interface TransitFiltersProps {
  activeFilters: { [key: string]: boolean };
  toggleCategory: (category: 'subway' | 'lightrail' | 'commuter') => void;
  toggleLine: (line: string) => void;
  showAll: () => void;
}

export default function TransitFilters({ activeFilters, toggleCategory, toggleLine, showAll }: TransitFiltersProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [isInsideExpanded, setIsInsideExpanded] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Define line groups for checking category status
  const SUBWAY_LINES = ["Orange", "Red", "Blue"];
  const LIGHTRAIL_LINES = ["Green-B", "Green-C", "Green-D", "Green-E", "Mattapan"];
  const COMMUTER_LINES = ['CR-Fairmount', 'CR-Fitchburg', 'CR-Worcester', 'CR-Franklin', 'CR-Greenbush',
  'CR-Haverhill', 'CR-Kingston', 'CR-Lowell', 'CR-Middleborough', 'CR-Needham',
  'CR-Newburyport', 'CR-Providence', 'CR-Foxboro'];

  // Function to check if all lines in a category are OFF
  const isCategoryOff = (lines: string[]) => lines.every(line => !activeFilters[line]);

  // Handles hover enter, prevents collapse
  const handleMouseEnter = (category: string) => {
    if (timeoutId) clearTimeout(timeoutId);
    setHovered(category);
    setIsInsideExpanded(true);
  };

  // Handles hover leave with 50ms delay
  const handleMouseLeave = () => {
    setIsInsideExpanded(false);
    const id = setTimeout(() => {
        if (isInsideExpanded) {
            setHovered(null);
        }
    }, 50);
    setTimeoutId(id);
  };

  // Ensures proper resizing back to normal when moving away
  useEffect(() => {
    if (!hovered && !isInsideExpanded) {
      setTimeout(() => {
        setHovered(null);
      }, 50);
    }
  }, [hovered]);

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 p-3 bg-black rounded-lg shadow-md">
      
      {/* Subway Icon with O, R, B */}
      <div
        className={`relative flex items-center transition-opacity duration-300 ${
          hovered && hovered !== "subway" ? "opacity-50" : "opacity-100"
        }`}
        onMouseEnter={() => handleMouseEnter("subway")}
        onMouseLeave={() => handleMouseLeave()}
      >
        {hovered === "subway" && (
          <div
            className="absolute right-14 flex gap-2 p-2 bg-gray-800 rounded-lg shadow-lg transition-all duration-300"
            onMouseEnter={() => handleMouseEnter("subway")}
            onMouseLeave={() => handleMouseLeave()}
          >
            {SUBWAY_LINES.map((line) => (
              <Image
                key={line}
                src={`/icons/icon-${line.toLowerCase()}-line-default.svg`}
                alt={`${line} line icon`}
                className={`h-8 w-8 flex transition-all duration-300 cursor-pointer max-w-[40px] max-h-[40px] object-contain ${
                  !activeFilters[line] ? "opacity-50" : "opacity-100"
                }`}
                onClick={() => toggleLine(line)}
                width={40}
                height={40}
              />
            ))}
          </div>
        )}
        <Button
            className={`relative h-8 w-8 flex items-center justify-center transition-transform duration-300 ${
                hovered === "subway" ? "scale-125" : "scale-100"
              } ${isCategoryOff(SUBWAY_LINES) ? "opacity-50" : "opacity-100"}`}
            onClick={() => toggleCategory("subway")}
            >
            <Image 
                src={`/icons/icon-mode-subway-small.svg`} 
                alt="subway-icon" 
                className="w-8 h-8 max-w-[40px] max-h-[40px] object-contain"
                width={40}
                height={40}
            />
        </Button>

      </div>

      {/* Light Rail Icon with B, C, D, E, M */}
      <div
        className={`relative flex items-center transition-opacity duration-300 ${
          hovered && hovered !== "lightrail" ? "opacity-50" : "opacity-100"
        }`}
        onMouseEnter={() => handleMouseEnter("lightrail")}
        onMouseLeave={() => handleMouseLeave()}
      >
        {hovered === "lightrail" && (
            <div
                className="absolute right-14 flex gap-2 p-2 bg-gray-800 rounded-lg shadow-lg transition-all duration-300"
                onMouseEnter={() => handleMouseEnter("lightrail")}
                onMouseLeave={() => handleMouseLeave()}
            >
                {LIGHTRAIL_LINES.map((line) => {
                let srcPath = "";

                // Handle Green Line segments (Green-B, Green-C, etc.)
                if (line.includes("Green")) {
                    const shortLine = line.split("-")[1]; // Extract "B", "C", "D", "E"
                    srcPath = `/icons/icon-green-line-${shortLine.toLowerCase()}-default.svg`;
                } 
                // Handle Mattapan separately (without 'green-line')
                else if (line === "Mattapan") {
                    srcPath = `/icons/icon-mattapan-line-default.svg`;
                }

                return (
                    <Image
                    key={line}
                    src={srcPath}
                    alt={`${line} line icon`}
                    className={`h-8 w-8 flex transition-all duration-300 cursor-pointer max-w-[40px] max-h-[40px] object-contain ${
                        !activeFilters[line] ? "opacity-50" : "opacity-100"
                    }`}
                    onClick={() => toggleLine(line)}
                    width={40}
                    height={40}
                    />
                );
                })}
            </div>
        )}


        <Button
          className={`relative h-8 w-8 flex items-center justify-center bg-white rounded-full transition-transform duration-300 ${
            hovered === "lightrail" ? "scale-125" : "scale-100"
          } ${isCategoryOff(LIGHTRAIL_LINES) ? "opacity-50" : "opacity-100"}`}
          onClick={() => toggleCategory("lightrail")}
        >
          <Image
                src={`/icons/icon-mode-trolley-small.svg`} 
                alt="trolley-icon" 
                className="w-8 h-8 max-w-[40px] max-h-[40px] object-contain"
                width={40}
                height={40}
            />
        </Button>
      </div>

      {/* Commuter Rail Icon with "C" */}
      <div
        className={`relative flex items-center transition-opacity duration-300 ${
          hovered && hovered !== "commuter" ? "opacity-50" : "opacity-100"
        }`}
        onMouseEnter={() => handleMouseEnter("commuter")}
        onMouseLeave={() => handleMouseLeave()}
      >
        {/* {hovered === "commuter" && (
          <span
            className={`absolute right-14 font-bold h-8 w-8 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
              isCategoryOff(COMMUTER_LINES) ? "opacity-50" : "opacity-100"
            } bg-purple-500 text-white`}
            onClick={() => toggleCategory("commuter")}
          >
            C
          </span>
        )} */}
        <Button
          className={`relative h-8 w-8 flex items-center justify-center transition-transform duration-300 ${
            hovered === "commuter" ? "scale-125" : "scale-100"
          } ${isCategoryOff(COMMUTER_LINES) ? "opacity-50" : "opacity-100"}`}
          onClick={() => toggleCategory("commuter")}
        >
          <Image
                src={`/icons/icon-mode-commuter-rail-small.svg`} 
                alt="commuter-icon" 
                className="w-8 h-8 max-w-[40px] max-h-[40px] object-contain"
                width={40}
                height={40}
            />
        </Button>
      </div>

      {/* Show All Button with Tooltip */}
      <div
        className={`relative flex items-center transition-opacity duration-300 ${
            hovered && hovered !== "showAll" ? "opacity-50" : "opacity-100"
          }`}
        onMouseEnter={() => handleMouseEnter("showAll")}
        onMouseLeave={() => handleMouseLeave()}
      >
        {hovered === "showAll" && (
          <span className="absolute right-14 whitespace-nowrap bg-black text-white py-1 px-2 rounded-md transition-all duration-300">
            Show All
          </span>
        )}
        <Button
          variant="outline"
          className={`rounded-full border h-8 w-8 flex items-center justify-center bg-white transition-transform duration-300 ${
            hovered === "showAll" ? "scale-125" : "scale-100"
          }`}
          onClick={showAll}
        >
          🔄
        </Button>
      </div>
    </div>
  );
}
