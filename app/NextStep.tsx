"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

// Types
interface BuildingTags {
  building?: string;
  name?: string;
  "addr:housename"?: string;
  "building:levels"?: string;
  levels?: string;
  [key: string]: string | undefined;
}

interface Building {
  id: string | number;
  name: string | null;
  tags: BuildingTags;
  originalCoords: number[][];
  projectedCoords: number[][];
  projectedCenter: number[];
  height: number;
}

interface CenterPoint {
  lat: number;
  lng: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Building3DProps {
  building: Building;
  position: [number, number, number];
  onHeightChange: (buildingId: string | number, newHeight: number) => void;
}

interface LocationInputProps {
  onLocationChange: (location: string) => void;
  loading: boolean;
}

interface MapViewProps {
  buildings: Building[];
  selectedIds: (string | number)[];
  onBuildingClick: (buildingId: string | number) => void;
  onPolygonSelect: (buildingIds: (string | number)[]) => void;
}

interface BuildingListProps {
  buildings: Building[];
  selectedIds: (string | number)[];
  onBuildingClick: (buildingId: string | number) => void;
  onHeightChange: (buildingId: string | number, newHeight: number) => void;
}

// Height estimation based on building type
const getEstimatedHeight = (tags: BuildingTags): number => {
  const buildingType = tags.building;
  const levels =
    parseInt(tags["building:levels"] || "") || parseInt(tags.levels || "");

  // If levels are specified, use them (assume 3m per level)
  if (levels) {
    return levels * 3;
  }

  // Height estimation by building type
  const heightMap: Record<string, number> = {
    house: 6,
    residential: 8,
    apartments: 15,
    commercial: 12,
    retail: 6,
    office: 20,
    industrial: 8,
    warehouse: 10,
    hospital: 15,
    school: 8,
    church: 12,
    mosque: 10,
    temple: 8,
    hotel: 25,
    mall: 12,
    supermarket: 6,
    parking: 6,
    garage: 3,
    yes: 8, // default building
  };

  return heightMap[buildingType || "yes"] || 8;
};

// Convert lat/lng to local coordinates
const projectCoordinates = (
  coords: number[][],
  center: CenterPoint
): number[][] => {
  const scale = 100000; // Scale factor
  return coords.map((coord) => [
    (coord[1] - center.lng) * scale * Math.cos((center.lat * Math.PI) / 180),
    (coord[0] - center.lat) * scale,
  ]);
};

// Get center point of polygon, return [lng, lat]
const getPolygonCenter = (coords: number[][]): number[] => {
  const x = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length; // lng
  const y = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length; // lat
  return [x, y];
};

// Component untuk building 3D dengan height yang bisa diedit
function Building3D({ building, position, onHeightChange }: Building3DProps) {
  const meshRef = useRef<THREE.Mesh | null>(null);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const coords = building.projectedCoords;

    if (!coords || coords.length < 3) return new THREE.BoxGeometry(1, 1, 1);

    // Membuat shape dari koordinat building
    shape.moveTo(coords[0][0], coords[0][1]);
    for (let i = 1; i < coords.length - 1; i++) {
      shape.lineTo(coords[i][0], coords[i][1]);
    }

    // Ekstraksi ke 3D
    const extrudeSettings = {
      depth: building.height,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [building.projectedCoords, building.height]);

  const getBuildingColor = (buildingType?: string): string => {
    const colorMap: Record<string, string> = {
      house: "#4a90e2",
      residential: "#5cb85c",
      apartments: "#f0ad4e",
      commercial: "#d9534f",
      office: "#5bc0de",
      industrial: "#777",
      hospital: "#ff69b4",
      school: "#ffa500",
      church: "#800080",
      mosque: "#008080",
      hotel: "#ff1493",
    };
    return colorMap[buildingType || "yes"] || "#4a90e2";
  };

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={getBuildingColor(building.tags.building)}
          transparent={true}
          opacity={0.8}
        />
      </mesh>
      {building.projectedCenter && (
        <Text
          position={[
            building.projectedCenter[0],
            building.height + 2,
            -building.projectedCenter[1],
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {building.name || building.tags.building || "Building"}
          {"\n"}
          {building.height}m
        </Text>
      )}
    </group>
  );
}

// Location input component
function LocationInput({ onLocationChange, loading }: LocationInputProps) {
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      onLocationChange(location.trim());
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude}, ${longitude}`);
          onLocationChange(`${latitude}, ${longitude}`);
        },
        (error) => {
          alert("Error getting location: " + error.message);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="mb-4 p-4 text-black bg-blue-50 rounded-lg">
      <h3 className="font-semibold mb-2">Pilih Lokasi</h3>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
        <input
          type="text"
          value={location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setLocation(e.target.value)
          }
          placeholder="Nama kota atau lat,lng (contoh: Surabaya atau -7.2575,112.7521)"
          className="flex-1 p-2 border rounded"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !location.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Cari"}
        </button>
      </form>
      <button
        onClick={handleCurrentLocation}
        disabled={loading}
        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
      >
        Gunakan lokasi saat ini
      </button>
    </div>
  );
}

// Point-in-polygon test using ray casting algorithm
const pointInPolygon = (point: number[], polygon: number[][]): boolean => {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

// Map view component with polygon selection
function MapView({
  buildings,
  selectedIds,
  onBuildingClick,
  onPolygonSelect,
}: MapViewProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<number[][]>([]);
  const [selectionMode, setSelectionMode] = useState<"click" | "polygon">(
    "click"
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const svgWidth = 1000;
  const svgHeight = 1000;

  // Find bounds of all buildings to auto-scale
  const bounds = useMemo((): Bounds => {
    if (buildings.length === 0)
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    buildings.forEach((building) => {
      if (building.projectedCoords) {
        building.projectedCoords.forEach((coord) => {
          minX = Math.min(minX, coord[0]);
          maxX = Math.max(maxX, coord[0]);
          minY = Math.min(minY, coord[1]);
          maxY = Math.max(maxY, coord[1]);
        });
      }
    });

    const padding = Math.max(maxX - minX, maxY - minY) * 0.1;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    };
  }, [buildings]);

  const scaleX = (x: number): number =>
    ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (svgWidth - 40) + 20;
  const scaleY = (y: number): number =>
    ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * (svgHeight - 40) + 20;

  const unscaleX = (x: number): number =>
    ((x - 20) / (svgWidth - 40)) * (bounds.maxX - bounds.minX) + bounds.minX;
  const unscaleY = (y: number): number =>
    ((y - 20) / (svgHeight - 40)) * (bounds.maxY - bounds.minY) + bounds.minY;

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selectionMode !== "polygon") return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const worldX = unscaleX(x);
    const worldY = unscaleY(y);

    if (!isDrawing) {
      // Start new polygon
      setIsDrawing(true);
      setCurrentPolygon([[worldX, worldY]]);
    } else {
      // Add point to current polygon
      setCurrentPolygon((prev) => [...prev, [worldX, worldY]]);
    }
  };

  const finishPolygon = () => {
    if (currentPolygon.length >= 3) {
      // Find buildings inside the polygon
      const buildingsInside = buildings.filter((building) => {
        if (!building.projectedCenter) return false;
        return pointInPolygon(building.projectedCenter, currentPolygon);
      });

      onPolygonSelect(buildingsInside.map((b) => b.id));
    }

    setIsDrawing(false);
    setCurrentPolygon([]);
  };

  const cancelPolygon = () => {
    setIsDrawing(false);
    setCurrentPolygon([]);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-100 p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Map View</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectionMode("click");
                cancelPolygon();
              }}
              className={`px-2 py-1 text-xs rounded ${
                selectionMode === "click"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Click Select
            </button>
            <button
              onClick={() => setSelectionMode("polygon")}
              className={`px-2 py-1 text-xs rounded ${
                selectionMode === "polygon"
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Polygon Select
            </button>
          </div>
        </div>

        {selectionMode === "polygon" && (
          <div className="text-xs text-gray-600 mb-2">
            {!isDrawing ? (
              "Klik untuk mulai menggambar polygon selection"
            ) : (
              <div className="flex items-center gap-2">
                <span>Drawing polygon... ({currentPolygon.length} points)</span>
                <button
                  onClick={finishPolygon}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                >
                  Finish
                </button>
                <button
                  onClick={cancelPolygon}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        className="bg-green-50 cursor-crosshair"
        onClick={handleSVGClick}
      >
        {/* Render buildings */}
        {buildings.map((building) => {
          if (!building.projectedCoords) return null;

          const isSelected = selectedIds.includes(building.id);
          const scaledCoords = building.projectedCoords.map((coord) => [
            scaleX(coord[0]),
            scaleY(coord[1]),
          ]);

          const pathData = `M ${scaledCoords
            .map((coord) => coord.join(" "))
            .join(" L ")} Z`;

          return (
            <g key={building.id}>
              <path
                d={pathData}
                fill={isSelected ? "#ff6b6b" : "#e0e0e0"}
                stroke={isSelected ? "#ff4757" : "#666"}
                strokeWidth="1"
                className={`${
                  selectionMode === "click"
                    ? "cursor-pointer hover:fill-gray-300"
                    : ""
                } transition-colors`}
                onClick={(e) => {
                  if (selectionMode === "click") {
                    e.stopPropagation();
                    onBuildingClick(building.id);
                  }
                }}
              />
              {/* Building center dot */}
              {building.projectedCenter && (
                <circle
                  cx={scaleX(building.projectedCenter[0])}
                  cy={scaleY(building.projectedCenter[1])}
                  r="1"
                  fill="#333"
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}

        {/* Render current polygon being drawn */}
        {isDrawing && currentPolygon.length > 0 && (
          <>
            {/* Polygon outline */}
            {currentPolygon.length > 2 && (
              <polygon
                points={currentPolygon
                  .map((point) => `${scaleX(point[0])},${scaleY(point[1])}`)
                  .join(" ")}
                fill="rgba(0, 255, 0, 0.1)"
                stroke="green"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}

            {/* Polygon points */}
            {currentPolygon.map((point, index) => (
              <circle
                key={index}
                cx={scaleX(point[0])}
                cy={scaleY(point[1])}
                r="3"
                fill="green"
                stroke="white"
                strokeWidth="1"
              />
            ))}

            {/* Lines connecting points */}
            {currentPolygon.length > 1 && (
              <polyline
                points={currentPolygon
                  .map((point) => `${scaleX(point[0])},${scaleY(point[1])}`)
                  .join(" ")}
                fill="none"
                stroke="green"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
          </>
        )}
      </svg>
    </div>
  );
}

// Building list with height editing
function BuildingList({
  buildings,
  selectedIds,
  onBuildingClick,
  onHeightChange,
}: BuildingListProps) {
  return (
    <div className="mt-4 max-h-64 overflow-y-auto">
      <h3 className="font-medium mb-2">Building List ({buildings.length}):</h3>
      <div className="space-y-2">
        {buildings.map((building) => (
          <div
            key={building.id}
            className={`p-2 rounded border transition-colors ${
              selectedIds.includes(building.id)
                ? "bg-red-100 border-red-300"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div
              className="cursor-pointer"
              onClick={() => onBuildingClick(building.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {building.name ||
                    building.tags.building ||
                    `Building ${building.id}`}
                </span>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                  {building.tags.building}
                </span>
              </div>
            </div>

            {selectedIds.includes(building.id) && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <label className="block text-xs text-gray-600 mb-1">
                  Height (meters):
                </label>
                <input
                  type="number"
                  value={building.height}
                  onChange={(e) =>
                    onHeightChange(building.id, parseFloat(e.target.value) || 1)
                  }
                  min="1"
                  max="200"
                  className="w-full p-1 text-sm border rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Export functions
const exportToSTL = (selectedBuildings: Building[]): void => {
  // Create STL content
  let stlContent = "solid BuildingModel\n";

  selectedBuildings.forEach((building) => {
    if (!building.projectedCoords || building.projectedCoords.length < 3)
      return;

    const coords = building.projectedCoords;
    const height = building.height;

    // Create bottom face triangles
    for (let i = 1; i < coords.length - 2; i++) {
      const v1 = [coords[0][0], 0, -coords[0][1]];
      const v2 = [coords[i][0], 0, -coords[i][1]];
      const v3 = [coords[i + 1][0], 0, -coords[i + 1][1]];

      stlContent += `  facet normal 0 -1 0\n`;
      stlContent += `    outer loop\n`;
      stlContent += `      vertex ${v1.join(" ")}\n`;
      stlContent += `      vertex ${v2.join(" ")}\n`;
      stlContent += `      vertex ${v3.join(" ")}\n`;
      stlContent += `    endloop\n`;
      stlContent += `  endfacet\n`;
    }

    // Create top face triangles
    for (let i = 1; i < coords.length - 2; i++) {
      const v1 = [coords[0][0], height, -coords[0][1]];
      const v2 = [coords[i + 1][0], height, -coords[i + 1][1]];
      const v3 = [coords[i][0], height, -coords[i][1]];

      stlContent += `  facet normal 0 1 0\n`;
      stlContent += `    outer loop\n`;
      stlContent += `      vertex ${v1.join(" ")}\n`;
      stlContent += `      vertex ${v2.join(" ")}\n`;
      stlContent += `      vertex ${v3.join(" ")}\n`;
      stlContent += `    endloop\n`;
      stlContent += `  endfacet\n`;
    }

    // Create side faces
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i];
      const next = coords[(i + 1) % (coords.length - 1)];

      // Two triangles per side face
      const v1 = [current[0], 0, -current[1]];
      const v2 = [next[0], 0, -next[1]];
      const v3 = [next[0], height, -next[1]];
      const v4 = [current[0], height, -current[1]];

      // Calculate normal
      const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0],
      ];
      const length = Math.sqrt(
        normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]
      );
      normal[0] /= length;
      normal[1] /= length;
      normal[2] /= length;

      // First triangle
      stlContent += `  facet normal ${normal.join(" ")}\n`;
      stlContent += `    outer loop\n`;
      stlContent += `      vertex ${v1.join(" ")}\n`;
      stlContent += `      vertex ${v2.join(" ")}\n`;
      stlContent += `      vertex ${v3.join(" ")}\n`;
      stlContent += `    endloop\n`;
      stlContent += `  endfacet\n`;

      // Second triangle
      stlContent += `  facet normal ${normal.join(" ")}\n`;
      stlContent += `    outer loop\n`;
      stlContent += `      vertex ${v1.join(" ")}\n`;
      stlContent += `      vertex ${v3.join(" ")}\n`;
      stlContent += `      vertex ${v4.join(" ")}\n`;
      stlContent += `    endloop\n`;
      stlContent += `  endfacet\n`;
    }
  });

  stlContent += "endsolid BuildingModel\n";

  // Download file
  const blob = new Blob([stlContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "buildings.stl";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToOBJ = (selectedBuildings: Building[]): void => {
  let objContent = "# Building Model\n";
  let vertexIndex = 1;

  selectedBuildings.forEach((building, buildingIndex) => {
    if (!building.projectedCoords || building.projectedCoords.length < 3)
      return;

    objContent += `\n# Building ${buildingIndex + 1}\n`;
    objContent += `g building_${buildingIndex + 1}\n`;

    const coords = building.projectedCoords;
    const height = building.height;
    const startVertex = vertexIndex;

    // Add vertices (bottom face)
    coords.forEach((coord) => {
      objContent += `v ${coord[0]} 0 ${-coord[1]}\n`;
      vertexIndex++;
    });

    // Add vertices (top face)
    coords.forEach((coord) => {
      objContent += `v ${coord[0]} ${height} ${-coord[1]}\n`;
      vertexIndex++;
    });

    const numVertices = coords.length;

    // Add faces (bottom face)
    for (let i = 2; i < numVertices - 1; i++) {
      objContent += `f ${startVertex} ${startVertex + i - 1} ${
        startVertex + i
      }\n`;
    }

    // Add faces (top face)
    for (let i = 2; i < numVertices - 1; i++) {
      objContent += `f ${startVertex + numVertices} ${
        startVertex + numVertices + i
      } ${startVertex + numVertices + i - 1}\n`;
    }

    // Add faces (side faces)
    for (let i = 0; i < numVertices - 1; i++) {
      const current = startVertex + i;
      const next = startVertex + ((i + 1) % (numVertices - 1));
      const currentTop = startVertex + numVertices + i;
      const nextTop = startVertex + numVertices + ((i + 1) % (numVertices - 1));

      // Two triangles per side
      objContent += `f ${current} ${next} ${nextTop}\n`;
      objContent += `f ${current} ${nextTop} ${currentTop}\n`;
    }
  });

  // Download file
  const blob = new Blob([objContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "buildings.obj";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Main component
export default function Building3DExtruder() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<
    (string | number)[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [centerPoint, setCenterPoint] = useState<CenterPoint | null>(null);

  // Fetch buildings from OpenStreetMap
  const fetchBuildings = async (location: string): Promise<void> => {
    setLoading(true);
    setError(null);
    setBuildings([]);
    setSelectedBuildingIds([]);

    try {
      let lat, lng;

      // Check if location is coordinates or place name
      if (location.includes(",")) {
        [lat, lng] = location.split(",").map((s) => parseFloat(s.trim()));
      } else {
        // Geocode the location using Nominatim
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            location
          )}&limit=1`
        );
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.length === 0) {
          throw new Error("Location not found");
        }

        lat = parseFloat(geocodeData[0].lat);
        lng = parseFloat(geocodeData[0].lon);
      }

      setCenterPoint({ lat, lng });

      // Query OpenStreetMap for buildings
      const radius = 500; // 500 meters
      const overpassQuery = `
        [out:json][timeout:25];
        (
          way["building"](around:${radius},${lat},${lng});
          relation["building"]["type"="multipolygon"](around:${radius},${lat},${lng});
        );
        out geom;
      `;

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
        headers: {
          "Content-Type": "text/plain",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch building data");
      }

      const data = await response.json();

      // Process the building data
      const processedBuildings: Building[] = data.elements
        .filter(
          (element: any) => element.geometry && element.geometry.length > 2
        )
        .map((element: any, index: number): Building => {
          const coords = element.geometry.map((node: any) => [
            node.lat,
            node.lon,
          ]);
          const projectedCoords = projectCoordinates(coords, { lat, lng });
          const projectedCenter = projectCoordinates(
            [getPolygonCenter(coords)],
            { lat, lng }
          )[0];

          const estimatedHeight = getEstimatedHeight(element.tags || {});

          return {
            id: element.id || `temp_${index}`,
            name:
              element.tags?.name || element.tags?.["addr:housename"] || null,
            tags: element.tags || {},
            originalCoords: coords,
            projectedCoords: projectedCoords,
            projectedCenter: projectedCenter,
            height: estimatedHeight,
          };
        })
        .filter((building: Building) => building.projectedCoords.length > 2);

      setBuildings(processedBuildings);

      // Auto-select first few buildings for demo
      if (processedBuildings.length > 0) {
        setSelectedBuildingIds(
          processedBuildings
            .slice(0, Math.min(3, processedBuildings.length))
            .map((b) => b.id)
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingClick = useCallback((buildingId: string | number) => {
    setSelectedBuildingIds((prev) => {
      if (prev.includes(buildingId)) {
        return prev.filter((id) => id !== buildingId);
      } else {
        return [...prev, buildingId];
      }
    });
  }, []);

  const handlePolygonSelect = useCallback(
    (buildingIds: (string | number)[]) => {
      setSelectedBuildingIds((prev) => {
        // Add buildings that aren't already selected
        const newIds = buildingIds.filter((id) => !prev.includes(id));
        return [...prev, ...newIds];
      });
    },
    []
  );

  const handleHeightChange = useCallback(
    (buildingId: string | number, newHeight: number) => {
      setBuildings((prev) =>
        prev.map((building) =>
          building.id === buildingId
            ? { ...building, height: Math.max(1, newHeight) }
            : building
        )
      );
    },
    []
  );

  const selectedBuildings = useMemo(() => {
    return buildings.filter((building) =>
      selectedBuildingIds.includes(building.id)
    );
  }, [buildings, selectedBuildingIds]);

  const handleClearAll = () => setSelectedBuildingIds([]);
  const handleSelectAll = () =>
    setSelectedBuildingIds(buildings.map((b) => b.id));

  return (
    <div className="p-6 max-w-7xl mx-auto text-black">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Building 3D Extruder - OpenStreetMap Integration
        </h1>
        <p className="text-gray-600">
          Cari lokasi, pilih building, dan visualisasikan dalam 3D dengan height
          estimation otomatis
        </p>
      </div>

      <LocationInput onLocationChange={fetchBuildings} loading={loading} />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}

      {!loading && buildings.length === 0 && centerPoint && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700">
            No buildings found in this area. Try a different location.
          </p>
        </div>
      )}

      {buildings.length > 0 && (
        <>
          {/* Controls */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Pilih Semua
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Clear Semua
            </button>
            <div className="flex items-center text-sm text-gray-600">
              Terpilih: {selectedBuildingIds.length} dari {buildings.length}{" "}
              building
            </div>

            {selectedBuildings.length > 0 && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => exportToOBJ(selectedBuildings)}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                >
                  Export OBJ
                </button>
                <button
                  onClick={() => exportToSTL(selectedBuildings)}
                  className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
                >
                  Export STL
                </button>
              </div>
            )}
          </div>

          {/* Main layout */}
          <div className="">
            {/* Building list and Map */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold mb-3">Buildings & Map</h2>

              {/* Map View */}
              <MapView
                buildings={buildings}
                selectedIds={selectedBuildingIds}
                onBuildingClick={handleBuildingClick}
                onPolygonSelect={handlePolygonSelect}
              />

              <BuildingList
                buildings={buildings}
                selectedIds={selectedBuildingIds}
                onBuildingClick={handleBuildingClick}
                onHeightChange={handleHeightChange}
              />
            </div>

            {/* 3D Viewer */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-3">3D View</h2>
              <div className="border border-gray-300 rounded-lg overflow-hidden h-96">
                <div className="bg-gray-800 text-white p-2 text-sm font-semibold">
                  3D View - {selectedBuildings.length} building(s) selected
                </div>
                <div className="h-full bg-gray-900">
                  <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
                    <ambientLight intensity={0.4} />
                    <directionalLight
                      position={[30, 50, 30]}
                      intensity={1}
                      castShadow
                    />

                    {/* Grid helper */}
                    <gridHelper args={[100, 50]} />

                    {/* Render selected buildings */}
                    {selectedBuildings.map((building) => (
                      <Building3D
                        key={building.id}
                        building={building}
                        position={[0, 0, 0]}
                        onHeightChange={handleHeightChange}
                      />
                    ))}

                    <OrbitControls
                      enablePan={true}
                      enableZoom={true}
                      enableRotate={true}
                    />
                  </Canvas>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">Kontrol 3D:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Drag: Rotate view</li>
                  <li>• Scroll: Zoom in/out</li>
                  <li>• Right drag: Pan view</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Info section */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Fitur:</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p>✅ Real OpenStreetMap data via Overpass API</p>
              <p>
                ✅ Automatic height estimation based on building type and levels
              </p>
              <p>✅ Manual height editing for selected buildings</p>
              <p>✅ Export to STL and OBJ formats for 3D printing</p>
              <p>
                ✅ Polygon area selection tool untuk select multiple buildings
              </p>
              <p>✅ Coordinate projection from lat/lng to local 3D space</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
