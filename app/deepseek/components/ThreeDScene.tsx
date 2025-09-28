"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Raycaster, Vector2, Plane, Vector3 } from "three";
import {
  ThreeDSceneProvider,
  useThreeDScene,
} from "../contexts/ThreeDSceneContext";
import WaterArea from "./WaterArea"; // River water functionality (commented out)
import Building from "./Building";
import BaseRectangle from "./BaseRectangle";
import WaterShape2D from "./WaterShape2D"; // 2D preview functionality (commented out)
import * as turf from "@turf/turf";
import { osmToGeoJSON } from "@/utils/osmtogeojson";

// Define minimal GeoJSON types to avoid needing the full geojson package
interface GeoJsonGeometry {
  type: string;
  coordinates: any;
}

interface GeoJsonFeature {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties?: Record<string, any>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

// Interface for building data
interface BuildingData {
  id: string;
  coordinates: [number, number][];
  height: number;
  color: string;
}

// Interface for water area data
interface WaterAreaData {
  coordinates: [number, number][];
  width?: number;
  type: "line" | "polygon";
  waterwayType?: string;
  id: string;
}

// Individual scene component that uses the context
function SceneContent() {
  const context = useThreeDScene();
  const {
    coordinateScale,
    setCoordinateScale,
    bounds,
    buildings,
    waterAreas,
    selectedBuilding,
    baseHeight,
    waterHeight,
    polygonWaterHeight,
    riverWidthScale,
    setBuildings,
    setWaterAreas,
    setSelectedBuilding,
    setLoading,
    loading,
    setBaseHeight,
    setWaterHeight,
    setPolygonWaterHeight,
    setRiverWidthScale,
  } = context;

  const handleClickBuilding = (buildingId: string) => {
    setSelectedBuilding(buildingId);
  };

  const changeBuildingColor = (color: string) => {
    if (selectedBuilding) {
      setBuildings(
        buildings.map((bldg) =>
          bldg.id === selectedBuilding ? { ...bldg, color } : bldg
        )
      );
    }
    setSelectedBuilding(null);
  };

  const resetColors = () => {
    setBuildings(buildings.map((bldg) => ({ ...bldg, color: "#ffffff" })));
  };

  const exportTo3MF = () => {
    alert(
      "In a full implementation, this would export the 3D scene to a 3MF file using the @jscadui/3mf-export library."
    );
  };

  // Component to handle click events and clear selection when clicking on empty space
  const ClickHandler = () => {
    const { gl, scene, camera } = useThree();
    const raycaster = new Raycaster();
    const mouse = new Vector2();

    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = gl.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(scene.children, true);

        // Check if any building was clicked - buildings are in the group as children
        let buildingClicked = false;
        if (intersects.length > 0) {
          // Check if the clicked object is a building by checking if it's part of the building hierarchy
          for (let i = 0; i < intersects.length; i++) {
            const object = intersects[i].object;
            // Check if this object is a building by looking at its parent hierarchy
            // All building meshes should have unique building data associated with them
            if (object.userData && object.userData.buildingId) {
              buildingClicked = true;
              break;
            }
            // Or check if the object has metadata that identifies it as a building
            if (object.name && object.name.startsWith("building-")) {
              buildingClicked = true;
              break;
            }
          }
        }

        // If no building was clicked, clear the selection
        if (!buildingClicked) {
          setSelectedBuilding(null);
        }
      };

      gl.domElement.addEventListener("click", handleClick);

      return () => {
        gl.domElement.removeEventListener("click", handleClick);
      };
    }, [gl, scene, camera]); // Removed raycaster from dependency array since it's created locally

    return null;
  };

  // Component to handle clipping planes for the bounds (only for buildings)
  const BoundsClippingPlanes = () => {
    const { scene, gl, camera } = useThree();

    useEffect(() => {
      // Calculate positions based on the bounds using the same calculation as BaseRectangle
      const COORDINATE_SCALE = 10000; // Same as in BaseRectangle
      const centerLon = (bounds.east + bounds.west) / 2;
      const centerLat = (bounds.north + bounds.south) / 2;

      // Calculate positions similar to BaseRectangle
      const westPos = (bounds.west - centerLon) * COORDINATE_SCALE;
      const eastPos = (bounds.east - centerLon) * COORDINATE_SCALE;
      const northPos = (bounds.north - centerLat) * COORDINATE_SCALE;
      const southPos = (bounds.south - centerLat) * COORDINATE_SCALE;

      // Create 4 clipping planes to form a rectangular boundary (only affects x,y - longitude,latitude)
      // We only clip in the X and Y dimensions, not Z (height)
      const planes = [
        // Left plane (west) - blocks X values less than west boundary
        new Plane(new Vector3(1, 0, 0), -westPos), // Normal pointing right (positive X), distance from origin
        // Right plane (east) - blocks X values greater than east boundary
        new Plane(new Vector3(-1, 0, 0), eastPos), // Normal pointing left (negative X), distance from origin
        // Bottom plane (south) - blocks Y values less than south boundary
        new Plane(new Vector3(0, 1, 0), -southPos), // Normal pointing up (positive Y), distance from origin
        // Top plane (north) - blocks Y values greater than north boundary
        new Plane(new Vector3(0, -1, 0), northPos), // Normal pointing down (negative Y), distance from origin
      ];

      // Set the clipping planes on the renderer
      gl.clippingPlanes = planes;

      // Update the camera's clipping planes as well
      (camera as any).clippingPlanes = planes;

      // Only update materials for building meshes, not base or other objects
      scene.traverse((object) => {
        if (
          'isMesh' in object &&
          object.isMesh &&
          object.name &&
          object.name.startsWith("building-")
        ) {
          const mesh = object as import('three').Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => {
              if (material) {
                material.clippingPlanes = planes;
                material.needsUpdate = true;
              }
            });
          } else if (mesh.material) {
            mesh.material.clippingPlanes = planes;
            mesh.material.needsUpdate = true;
          }
        }
      });

      // Cleanup function
      return () => {
        gl.clippingPlanes = [];
        (camera as any).clippingPlanes = [];
        scene.traverse((object) => {
          if (
            'isMesh' in object &&
            object.isMesh &&
            object.name &&
            object.name.startsWith("building-")
          ) {
            const mesh = object as import('three').Mesh;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((material) => {
                if (material) {
                  material.clippingPlanes = [];
                  material.needsUpdate = true;
                }
              });
            } else if (mesh.material) {
              mesh.material.clippingPlanes = [];
              mesh.material.needsUpdate = true;
            }
          }
        });
      };
    }, [bounds, scene, gl, camera]);

    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!bounds.north || !bounds.south || !bounds.east || !bounds.west) {
          console.error("3D Scene: Invalid bounds parameters");
          setLoading(false);
          return;
        }

        setLoading(true);

        // Log the actual URL being called for debugging
        const buildingsUrl = `/deepseek/api/osm/buildings?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;

        // Fetch buildings
        const buildingsRes = await fetch(buildingsUrl);

        if (!buildingsRes.ok) {
          const errorData = await buildingsRes.json();
          throw new Error(
            errorData.error ||
              `Buildings API request failed with status ${buildingsRes.status}`
          );
        }

        const buildingsData = await buildingsRes.json();
        const processedBuildings = processOSMData(buildingsData.elements);
        setBuildings(
          processedBuildings.map((bldg) => ({
            ...bldg,
            color: "#ffffff", // Default white color
          }))
        );

        // Fetch water areas (COMMENTED OUT)
        // const waterRes = await fetch(
        //   `/deepseek/api/osm/rivers?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`
        // );
        // console.log(
        //   "3D Scene: Received response from water API",
        //   waterRes.status
        // );

        // if (waterRes.ok) {
        //   const waterData = await waterRes.json();
        //   console.log(
        //     "3D Scene: Parsed water data from API",
        //     waterData.elements?.length || 0,
        //     "elements"
        //   );

        //   // Use osmtogeojson utility to convert water data to GeoJSON format
        //   const geojsonData = osmToGeoJSON(waterData);
        //   console.log("RiverData converted using osmtogeojson:", geojsonData);

        //   // Process the GeoJSON data to extract coordinates for use in our 3D scene
        //   const processedWater: WaterAreaData[] = (geojsonData as GeoJsonFeatureCollection).features.map((feature: GeoJsonFeature) => {
        //     // For polygons, coordinates are nested in an additional array [[lon, lat], ...]
        //     // For linestrings, coordinates are directly [lon, lat]
        //     let coordinates: [number, number][];

        //     if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
        //       coordinates = feature.geometry.coordinates[0].map((coord: [number, number]) => [coord[0], coord[1]]);
        //     } else if (feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString") {
        //       coordinates = feature.geometry.coordinates.map((coord: [number, number]) => [coord[0], coord[1]]);
        //     } else {
        //       // Default case - treat as empty coordinates array
        //       coordinates = [];
        //     }

        //     const waterwayType = feature.properties?.waterway;
        //     const naturalType = feature.properties?.natural;
        //     const id = feature.properties?.id?.toString();

        //     // Determine if it should be treated as a line or polygon based on the geometry type
        //     const geometryIsLine = feature.geometry.type === "LineString" ||
        //                           feature.geometry.type === "MultiLineString";

        //     // Determine if it should be treated as a polygon based on tags
        //     const geometryIsPolygon = feature.geometry.type === "Polygon" ||
        //                              feature.geometry.type === "MultiPolygon";

        //     // Use tag-based classification as primary, geometry as fallback
        //     const isLineWaterway = (waterwayType &&
        //       (waterwayType === "river" || waterwayType === "stream" ||
        //        waterwayType === "drain" || waterwayType === "ditch" ||
        //        waterwayType === "brook")) ||
        //       (geometryIsLine && !geometryIsPolygon);

        //     return {
        //       coordinates: coordinates,
        //       type: isLineWaterway ? "line" : "polygon",
        //       waterwayType: waterwayType || naturalType,
        //       id: id || `water-${Math.random()}`,
        //       width: feature.properties?.width ? parseFloat(feature.properties.width) : undefined
        //     };
        //   });

        //   console.log(
        //     `RiverData: Processed ${processedWater.length} water areas using osmtogeojson`
        //   );

        //   setWaterAreas(processedWater);
        // }

        // console.log("3D Scene: Finished setting data in state");
      } catch (error) {
        console.error("3D Scene: Error fetching data:", error);
        if (error instanceof TypeError)
          alert(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
        // console.log("3D Scene: Finished loading process");
      }
    };

    fetchData();
  }, [bounds, setBuildings, setWaterAreas, setLoading]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        Loading 3D buildings data...
      </div>
    );
  }

  return (
    <>
      <Canvas
        camera={{ position: [0, 100, 100], fov: 60 }}
        gl={{
          localClippingEnabled: true,
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Group to rotate entire scene -90 degrees on X axis */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {/* Base rectangle from the selected area */}
          <BaseRectangle bounds={bounds} height={baseHeight} />

          {/* Water areas (COMMENTED OUT) */}
          {/* {waterAreas.map((waterData, index) => {
            // Use different height for polygon water areas vs line waterways
            const height =
              waterData.type === "polygon" ? polygonWaterHeight : waterHeight;
            return (
              <WaterArea
                key={`water-${index}`}
                bounds={bounds}
                height={height}
                data={waterData}
                widthScale={riverWidthScale}
                waterwayType={waterData.waterwayType}
              />
            );
          })} */}

          {/* Buildings */}
          {buildings.map((building) => {
            // Check if building is within bounds before rendering
            const isBuildingInBounds = building.coordinates.some(
              ([lon, lat]) => {
                return (
                  lon >= bounds.west &&
                  lon <= bounds.east &&
                  lat >= bounds.south &&
                  lat <= bounds.north
                );
              }
            );

            if (!isBuildingInBounds) {
              return null; // Don't render buildings outside bounds
            }

            return (
              <Building
                key={building.id}
                data={building}
                isSelected={building.id === selectedBuilding}
                onClick={() => handleClickBuilding(building.id)}
                bounds={bounds}
                baseHeight={baseHeight}
              />
            );
          })}
        </group>

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["red", "green", "blue"]}
            labelColor="white"
          />
        </GizmoHelper>
        <OrbitControls />
        <gridHelper args={[100, 10]} />
        <ClickHandler />
        {/* <BoundsClippingPlanes /> */}
      </Canvas>

      {/* 2D Water Shape Visualization (COMMENTED OUT) */}
      {/* <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold mb-2">2D Water Shape Visualization</h3>
        <WaterShape2D
          waterAreas={waterAreas}
          bounds={bounds}
          width={800}
          height={400}
        />
      </div> */}

      {/* UI Controls */}
      <div className="absolute text-black top-4 left-4 bg-white p-4 rounded shadow-lg max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold mb-2">3D Controls</h3>

        {/* Height Controls */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Base Height: {baseHeight}m
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={baseHeight}
              onChange={(e) => setBaseHeight(parseFloat(e.target.value))}
              className="w-full"
            />
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={baseHeight}
              onChange={(e) => setBaseHeight(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 p-1 border rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Scale: 1/{coordinateScale}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={coordinateScale}
              onChange={(e) => setCoordinateScale(Number(e.target.value))}
              className="w-full mt-1 p-1 border rounded text-sm"
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium mb-1">
              Water Height: {waterHeight}m
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={waterHeight}
              onChange={(e) => setWaterHeight(parseFloat(e.target.value))}
              className="w-full"
            />
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={waterHeight}
              onChange={(e) => setWaterHeight(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 p-1 border rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              River Width Scale: {riverWidthScale.toFixed(2)}x
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={riverWidthScale}
              onChange={(e) => setRiverWidthScale(parseFloat(e.target.value))}
              className="w-full"
            />
            <input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={riverWidthScale}
              onChange={(e) =>
                setRiverWidthScale(parseFloat(e.target.value) || 0.1)
              }
              className="w-full mt-1 p-1 border rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Polygon Water Height: {polygonWaterHeight}m
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={polygonWaterHeight}
              onChange={(e) =>
                setPolygonWaterHeight(parseFloat(e.target.value))
              }
              className="w-full"
            />
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={polygonWaterHeight}
              onChange={(e) =>
                setPolygonWaterHeight(parseFloat(e.target.value) || 0)
              }
              className="w-full mt-1 p-1 border rounded text-sm"
            />
          </div> */}
        </div>

        {/* Building Controls */}
        <div className="space-y-2 border-t pt-3">
          <h4 className="font-bold">Building Controls</h4>
          <p className="text-sm">Selected: {selectedBuilding || "None"}</p>

          <div className="flex gap-2">
            {["#ffffff", "#00ff00", "#ff0000", "#0000ff"].map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: color }}
                onClick={() => changeBuildingColor(color)}
                title={
                  color === "#ffffff"
                    ? "White"
                    : color === "#ff0000"
                    ? "Red"
                    : color === "#00ff00"
                    ? "Green"
                    : "Blue"
                }
              />
            ))}
          </div>

          <button
            onClick={resetColors}
            className="bg-gray-200 px-3 py-1 rounded text-sm w-full hover:bg-gray-300"
          >
            Reset All Colors
          </button>
        </div>

        {/* Export Button */}
        <div className="border-t pt-3 mt-3">
          <button
            onClick={exportTo3MF}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm w-full hover:bg-blue-600"
          >
            Export to 3MF
          </button>
        </div>
      </div>
    </>
  );
}

// Helper functions moved outside the component
function processOSMData(elements: any[]): BuildingData[] {
  if (!elements || elements.length === 0) return [];

  // Process OSM elements to extract building geometries
  const nodes = elements.filter((element) => element.type === "node");
  const ways = elements.filter(
    (element) => element.type === "way" && element.tags?.building
  );

  // Create a map of node IDs to coordinates for faster lookup
  const nodeMap = new Map();
  nodes.forEach((node) => {
    nodeMap.set(node.id, { lon: node.lon, lat: node.lat });
  });

  const buildingsToProcess = ways;

  const result = buildingsToProcess.map((element, index) => {
    // Extract coordinates from nodes
    const coordinates: [number, number][] = [];
    if (element.nodes) {
      element.nodes.forEach((nodeId: number) => {
        const node = nodeMap.get(nodeId);
        if (node) {
          // Note: OSM coordinates are [longitude, latitude], we keep them in this order
          coordinates.push([node.lon, node.lat]);
        }
      });
    }

    // Get building height or estimate it
    let height = 3; // Default height
    if (element.tags?.height) {
      // Try to parse height value, could be in format "20" or "20 m" or "20m" or "20 ft"
      const heightValue = element.tags.height.toString().trim().toLowerCase();

      // Extract numeric part
      const match = heightValue.match(/^(\d+\.?\d*)/);
      if (match) {
        let numericHeight = parseFloat(match[1]);
        // Check for units
        if (heightValue.includes("ft") || heightValue.includes("feet")) {
          // Convert feet to meters
          numericHeight = numericHeight * 0.3048;
        }

        height = numericHeight;
      } else {
        height = parseFloat(element.tags.height) || 3;
      }
    } else if (element.tags?.["building:levels"]) {
      // Estimate height from number of levels (3m per level is a common approximation)
      const levels = parseFloat(element.tags["building:levels"]);
      if (!isNaN(levels) && levels > 0) {
        height = levels * 3;
      }
    }

    // Ensure height is reasonable (between 2m and 300m)
    if (height < 2) height = 2;
    if (height > 300) height = 300;

    return {
      id: element.id?.toString() || `building-${index}`,
      coordinates,
      height,
      color: "#ffffff", // Default white color
    } as BuildingData;
  });

  return result;
}

function processWaterData(elements: any[], bounds: any): WaterAreaData[] {
  if (!elements || elements.length === 0) return [];

  // Process OSM elements to extract water geometries (both line strings and polygons)
  const nodes = elements.filter((element) => element.type === "node");
  const ways = elements.filter(
    (element) =>
      element.type === "way" &&
      (element.tags?.waterway || element.tags?.natural === "water")
  );

  // Create a map of node IDs to coordinates for faster lookup
  const nodeMap = new Map();
  nodes.forEach((node) => {
    nodeMap.set(node.id, { lon: node.lon, lat: node.lat });
  });

  const result = ways
    .map((element) => {
      const coordinates: [number, number][] = [];
      let missingNodesCount = 0;

      if (element.nodes) {
        element.nodes.forEach((nodeId: number) => {
          const node = nodeMap.get(nodeId);
          if (node) {
            // Note: OSM coordinates are [longitude, latitude], we keep them in this order
            coordinates.push([node.lon, node.lat]);
          } else {
            missingNodesCount++;
          }
        });
      }

      // If too many nodes are missing, skip this element
      if (
        missingNodesCount > 0 &&
        element.nodes &&
        element.nodes.length > 0 &&
        missingNodesCount === element.nodes.length
      ) {
        return null;
      }

      // Filter coordinates to ensure they are within or close to the bounds
      // This replicates the server-side clipping functionality
      const tolerance = 0.0005; // Larger tolerance to account for buffer
      const filteredCoordinates = coordinates.filter(([lon, lat]) => {
        return (
          lon >= bounds.west - tolerance &&
          lon <= bounds.east + tolerance &&
          lat >= bounds.south - tolerance &&
          lat <= bounds.north + tolerance
        );
      });

      // Determine the waterway type (river, stream, canal, etc.)
      const waterwayType = element.tags?.waterway;
      const naturalType = element.tags?.natural;

      // Check if it's a closed polygon (water area) - only if it has coordinates after filtering
      const isClosed =
        filteredCoordinates.length > 2 &&
        filteredCoordinates[0][0] ===
          filteredCoordinates[filteredCoordinates.length - 1][0] &&
        filteredCoordinates[0][1] ===
          filteredCoordinates[filteredCoordinates.length - 1][1];

      // Get the width from element tags if available
      const width = element.tags?.width
        ? parseFloat(element.tags.width)
        : undefined;

      // Identify polygon water features - these should always be treated as polygons
      const isPolygonWater =
        naturalType === "water" ||
        waterwayType === "riverbank" ||
        waterwayType === "basin";

      // Check if this is a line waterway type (but not if it's closed and represents a polygon)
      const isLineWaterway =
        waterwayType &&
        (waterwayType === "river" ||
          waterwayType === "stream" ||
          waterwayType === "drain" ||
          waterwayType === "ditch" ||
          waterwayType === "brook");

      // Treat as polygon if:
      // 1. It's explicitly a polygon water type (natural=water, waterway=riverbank, etc.)
      // 2. It's a closed way (first and last nodes are the same)
      // 3. It has more than 2 coordinates and is not a line waterway
      if (isPolygonWater || (isClosed && filteredCoordinates.length > 2)) {
        return {
          coordinates: filteredCoordinates,
          type: "polygon" as const,
          waterwayType: waterwayType || naturalType,
          id: element.id.toString(),
        };
      } else if (isLineWaterway && filteredCoordinates.length >= 2) {
        // Process as line only if it's a line waterway type and has enough coordinates
        return {
          coordinates: filteredCoordinates,
          width,
          type: "line" as const,
          waterwayType: waterwayType,
          id: element.id.toString(),
        };
      } else if (filteredCoordinates.length > 2) {
        // Treat as polygon if it has more than 2 points but isn't specifically a line
        return {
          coordinates: filteredCoordinates,
          type: "polygon" as const,
          waterwayType: waterwayType || naturalType,
          id: element.id.toString(),
        };
      } else {
        return null; // Skip features with insufficient coordinates after filtering
      }
    })
    .filter((item) => item !== null) as WaterAreaData[]; // Remove null items

  return result;
}

// Main component that wraps the scene with the provider
export default function ThreeDScene({
  bounds,
}: {
  bounds: { north: number; south: number; east: number; west: number };
}) {
  return (
    <ThreeDSceneProvider bounds={bounds}>
      <SceneContent />
    </ThreeDSceneProvider>
  );
}
