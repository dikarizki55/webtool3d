// components/LeafletMap.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";

interface LeafletMapProps {
  onBoundsChange: (bounds: L.LatLngBounds | null) => void;
  selectedBounds: L.LatLngBounds | null;
  isDrawingMode: boolean;
  onDrawingModeChange: (isDrawing: boolean) => void;
}

const LeafletMap = ({
  onBoundsChange,
  selectedBounds,
  isDrawingMode,
  onDrawingModeChange,
}: LeafletMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const rectangleRef = useRef<L.Rectangle | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<L.LatLng | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map("map").setView([48.8584, 2.2945], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapRef.current);

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

      mapRef.current.addControl(searchControl);

      setMapInitialized(true);
    }

    return () => {
      if (mapRef.current) {
        // Clean up all event listeners
        mapRef.current.off("mousedown");
        mapRef.current.off("mousemove");
        mapRef.current.off("mouseup");
        mapRef.current.off("mouseout");
        mapRef.current.dragging.enable();
        mapRef.current.getContainer().style.cursor = "";
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapInitialized) return;

    if (isDrawingMode) {
      // Add rectangle drawing functionality
      mapRef.current.on("mousedown", startDrawing);
      mapRef.current.on("mousemove", drawRectangle);
      mapRef.current.on("mouseup", finishDrawing);
      mapRef.current.on("mouseout", finishDrawing); // Finish drawing if mouse leaves map
      mapRef.current.getContainer().style.cursor = "crosshair";
      mapRef.current.dragging.disable();
    } else {
      // Remove drawing event listeners
      mapRef.current.off("mousedown", startDrawing);
      mapRef.current.off("mousemove", drawRectangle);
      mapRef.current.off("mouseup", finishDrawing);
      mapRef.current.off("mouseout", finishDrawing);
      mapRef.current.getContainer().style.cursor = "";
      mapRef.current.dragging.enable();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off("mousedown", startDrawing);
        mapRef.current.off("mousemove", drawRectangle);
        mapRef.current.off("mouseup", finishDrawing);
        mapRef.current.off("mouseout", finishDrawing);
        mapRef.current.getContainer().style.cursor = "";
        mapRef.current.dragging.enable();
      }
    };
  }, [isDrawingMode, mapInitialized]);

  const startDrawing = (e: L.LeafletMouseEvent) => {
    if (!isDrawingMode) return;

    // Prevent interference with other map interactions
    if (
      e.originalEvent.shiftKey ||
      e.originalEvent.ctrlKey ||
      e.originalEvent.target !== mapRef.current?.getContainer()
    )
      return;

    isDrawingRef.current = true;
    startPointRef.current = e.latlng;

    // Remove existing rectangle
    if (rectangleRef.current) {
      mapRef.current?.removeLayer(rectangleRef.current);
      rectangleRef.current = null;
    }

    // Create new rectangle - convert LatLng to LatLngTuple for the bounds
    const latLngTuple: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];
    rectangleRef.current = L.rectangle([latLngTuple, latLngTuple], {
      color: "#3388ff",
      weight: 2,
      fillOpacity: 0.1,
    }).addTo(mapRef.current!);

    // Prevent default map interactions during drawing
    e.originalEvent.stopPropagation();
    e.originalEvent.preventDefault();
  };

  const drawRectangle = (e: L.LeafletMouseEvent) => {
    if (
      !isDrawingMode ||
      !isDrawingRef.current ||
      !rectangleRef.current ||
      !startPointRef.current
    )
      return;

    // Convert both points to LatLngTuple
    const startTuple: L.LatLngTuple = [
      startPointRef.current.lat,
      startPointRef.current.lng,
    ];
    const currentTuple: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];

    rectangleRef.current.setBounds([startTuple, currentTuple]);

    // Prevent default map interactions during drawing
    e.originalEvent.stopPropagation();
    e.originalEvent.preventDefault();
  };

  const finishDrawing = (e?: any) => {
    if (!isDrawingMode || !isDrawingRef.current) return;

    isDrawingRef.current = false;
    if (rectangleRef.current) {
      const bounds = rectangleRef.current.getBounds();
      onBoundsChange(bounds);
      onDrawingModeChange(false); // Exit drawing mode after selection
    }
    startPointRef.current = null;

    // Reset cursor
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor = "";
    }
  };

  const clearSelection = () => {
    if (rectangleRef.current && mapRef.current) {
      mapRef.current.removeLayer(rectangleRef.current);
      rectangleRef.current = null;
    }
    onBoundsChange(null);
  };

  return (
    <div className="h-full w-full relative">
      <div id="map" className="h-full w-full" />
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        <button
          onClick={() => onDrawingModeChange(!isDrawingMode)}
          className={`px-4 py-2 rounded-full shadow-[4px_4px_15px_0px_rgba(0,0,0,0.11)] ${
            isDrawingMode
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {isDrawingMode ? "Cancel Drawing" : "Draw Rectangle"}
        </button>
        {selectedBounds && (
          <button
            onClick={clearSelection}
            className="bg-gray-500 rounded-full shadow-[4px_4px_15px_0px_rgba(0,0,0,0.11)] text-white px-4 py-2 hover:bg-gray-600"
          >
            Clear Selection
          </button>
        )}
      </div>
    </div>
  );
};

export default LeafletMap;
