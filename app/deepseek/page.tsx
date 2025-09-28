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
      router.push(`/deepseek/generate-3d?bounds=${encodeURIComponent(boundsStr)}`);
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

      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={handleGenerate3D}
          disabled={!selectedBounds}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Generate 3D View
        </button>

        {!selectedBounds && (
          <p className="text-sm text-gray-600 mt-2">
            Please select an area using the rectangle tool first
          </p>
        )}
      </div>
    </div>
  );
}
