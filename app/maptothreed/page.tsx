// Homepage Component - 2D Map Interface
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import L from "leaflet";

// Dynamically import LeafletMap to avoid SSR issues
const LeafletMap = dynamic(() => import("./components/LeafletMap"), {
  ssr: false,
  loading: () => <div>Loading map...</div>,
});

export default function HomePage() {
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(
    null
  );
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const router = useRouter();

  const handleGenerate3D = () => {
    if (selectedBounds) {
      // Convert bounds to URL parameters
      const boundsStr = JSON.stringify({
        north: selectedBounds.getNorth(),
        south: selectedBounds.getSouth(),
        east: selectedBounds.getEast(),
        west: selectedBounds.getWest(),
      });

      // Use the correct route for the 3D view
      router.push(
        `/maptothreed/generate-3d?bounds=${encodeURIComponent(boundsStr)}`
      );
    }
  };

  return (
    <div className="h-screen w-full">
      <LeafletMap
        onBoundsChange={setSelectedBounds}
        selectedBounds={selectedBounds}
        isDrawingMode={isDrawingMode}
        onDrawingModeChange={setIsDrawingMode}
      />

      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end">
        <button
          onClick={handleGenerate3D}
          disabled={!selectedBounds}
          className="bg-blue-500 text-white px-4 py-2 rounded-full disabled:bg-gray-400 shadow-[4px_4px_15px_0px_rgba(0,0,0,0.11)]"
        >
          Generate 3D View
        </button>

        {!selectedBounds && (
          <div className="text-sm mt-2 bg-white shadow-[4px_4px_15px_0px_rgba(0,0,0,0.11)] p-4 rounded-2xl flex gap-2 text-red-500">
            <div className=" rounded-full bg-red-500 w-5 h-5 text-center font-bold text-white">
              !
            </div>
            Please select an area using the Draw Rectangle tool first
          </div>
        )}
      </div>
    </div>
  );
}
