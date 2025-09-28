// app/page.tsx
"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false, // ⬅️ penting biar ga jalan di server
});

export default function Home() {
  const handleBoundsChange = (bounds: any) => {
    console.log("Bounds changed:", bounds);
  };

  return (
    <main className="h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">
          Interactive Map - Rectangle Selector (Leaflet)
        </h1>
        <p className="text-sm text-gray-300">
          Click "Draw Rectangle" then drag on the map to select an area
        </p>
      </header>

      <div className="flex-1">
        <MapComponent onBoundsChange={handleBoundsChange} />
      </div>
    </main>
  );
}
