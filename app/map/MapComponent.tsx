// components/MapComponent.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapComponentProps {
  onBoundsChange?: (bounds: Bounds) => void;
}

export default function MapComponent({ onBoundsChange }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [currentRectangle, setCurrentRectangle] = useState<L.Rectangle | null>(
    null
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapRef.current).setView([-7.2575, 112.7521], 13); // Surabaya

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Tambah search control
      const provider = new OpenStreetMapProvider();
      const searchControl = new GeoSearchControl({
        provider,
        style: "bar", // atau 'button'
        autoComplete: true,
        autoCompleteDelay: 250,
        showMarker: true,
        showPopup: true,
        marker: {
          icon: new L.Icon.Default() as L.Icon<L.IconOptions>,
          draggable: false,
        },
      });

      map.addControl(searchControl);
    }

    return () => {
      if (mapInstanceRef.current) {
        // Clean up all event listeners
        mapInstanceRef.current.off("mousedown");
        mapInstanceRef.current.off("mousemove");
        mapInstanceRef.current.off("mouseup");
        mapInstanceRef.current.off("mouseout");
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const startDrawing = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing rectangle
    if (currentRectangle) {
      map.removeLayer(currentRectangle);
      setCurrentRectangle(null);
      setBounds(null);
    }

    setIsDrawing(true);
    map.dragging.disable();
    map.getContainer().style.cursor = "crosshair";

    let startLatLng: L.LatLng | null = null;
    let rectangle: L.Rectangle | null = null;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      // Prevent interference with other map interactions and search control
      if (e.originalEvent.shiftKey || e.originalEvent.ctrlKey || e.originalEvent.target !== map.getContainer()) return;
      
      startLatLng = e.latlng;

      // Create initial rectangle
      const initialBounds = L.latLngBounds(startLatLng, startLatLng);
      rectangle = L.rectangle(initialBounds, {
        color: "#ff0000",
        weight: 2,
        fillColor: "#ff0000",
        fillOpacity: 0.1,
      }).addTo(map);

      // Prevent default map interactions during drawing
      e.originalEvent.stopPropagation();

      map.on("mousemove", onMouseMove);
      map.on("mouseup", onMouseUp);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!startLatLng || !rectangle) return;

      const newBounds = L.latLngBounds(startLatLng, e.latlng);
      rectangle.setBounds(newBounds);
      
      // Prevent default map interactions during drawing
      e.originalEvent.stopPropagation();
      e.originalEvent.preventDefault();
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (!startLatLng || !rectangle) return;

      const finalBounds = rectangle.getBounds();
      const boundsData: Bounds = {
        north: finalBounds.getNorth(),
        south: finalBounds.getSouth(),
        east: finalBounds.getEast(),
        west: finalBounds.getWest(),
      };

      setBounds(boundsData);
      setCurrentRectangle(rectangle);
      onBoundsChange?.(boundsData);

      // Clean up
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);

      setIsDrawing(false);
      map.dragging.enable();
      map.getContainer().style.cursor = "";
      
      // Prevent default map interactions during drawing
      e.originalEvent.stopPropagation();
      e.originalEvent.preventDefault();
    };

    const onMouseOut = () => {
      // Finish drawing if mouse leaves map
      if (startLatLng && rectangle) {
        const finalBounds = rectangle.getBounds();
        const boundsData: Bounds = {
          north: finalBounds.getNorth(),
          south: finalBounds.getSouth(),
          east: finalBounds.getEast(),
          west: finalBounds.getWest(),
        };

        setBounds(boundsData);
        setCurrentRectangle(rectangle);
        onBoundsChange?.(boundsData);

        // Clean up
        map.off("mousemove", onMouseMove);
        map.off("mouseup", onMouseUp);

        setIsDrawing(false);
        map.dragging.enable();
        map.getContainer().style.cursor = "";
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mouseout", onMouseOut);
  };

  const clearRectangle = () => {
    const map = mapInstanceRef.current;
    if (!map || !currentRectangle) return;

    map.removeLayer(currentRectangle);
    setCurrentRectangle(null);
    setBounds(null);
  };

  const sendToAPI = async () => {
    if (!bounds) {
      alert("Please draw a rectangle first");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/coordinates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bounds),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Success! Response: ${JSON.stringify(result, null, 2)}`);
      } else {
        alert("Failed to send coordinates");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error sending coordinates");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Controls */}
      <div className="bg-white shadow-md p-4 flex gap-4 items-center flex-wrap">
        <button
          onClick={startDrawing}
          disabled={isDrawing}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isDrawing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isDrawing ? "Drawing..." : "Draw Rectangle"}
        </button>

        <button
          onClick={clearRectangle}
          disabled={!currentRectangle}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            !currentRectangle
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          Clear
        </button>

        <button
          onClick={sendToAPI}
          disabled={!bounds || isLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            !bounds || isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isLoading ? "Sending..." : "Send to API"}
        </button>

        {bounds && (
          <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
            <strong>Selected Bounds:</strong>
            <div>N: {bounds.north.toFixed(6)}</div>
            <div>S: {bounds.south.toFixed(6)}</div>
            <div>E: {bounds.east.toFixed(6)}</div>
            <div>W: {bounds.west.toFixed(6)}</div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="flex-1 w-full" />
    </div>
  );
}
