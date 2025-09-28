"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Raycaster, Vector2, Plane, Vector3 } from "three";
import {
  ThreeDSceneProvider,
  useThreeDScene,
} from "../contexts/ThreeDSceneContext";
import BaseRectangle from "./BaseRectangle";
import * as turf from "@turf/turf";
import BuildingCSG from "./Building";

// Interface for building data
interface BuildingData {
  id: string;
  coordinates: [number, number][];
  height: number;
  color: string;
}

// Individual scene component that uses the context
function SceneContent() {
  const context = useThreeDScene();
  const {
    coordinateScale,
    setCoordinateScale,
    bounds,
    buildings,
    selectedBuilding,
    baseHeight,
    setBuildings,
    setSelectedBuilding,
    setLoading,
    loading,
    setBaseHeight,
  } = context;

  const handleClickBuilding = (buildingId: string) => {
    setSelectedBuilding(buildingId);
  };

  const changeBuildingColor = (color: string) => {
    if (selectedBuilding) {
      setBuildings((prev) =>
        prev.map((bldg) =>
          bldg.id === selectedBuilding ? { ...bldg, color } : bldg
        )
      );
    }
    setSelectedBuilding(null);
  };

  const resetColors = () => {
    setBuildings((prev) => prev.map((bldg) => ({ ...bldg, color: "#ffffff" })));
  };

  const exportTo3MF = () => {
    alert(
      "In a full implementation, this would export the 3D scene to a 3MF file."
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
        const buildingsUrl = `/maptothreed/api/osm/buildings?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;

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

        // console.log("3D Scene: Finished setting data in state");
      } catch (error) {
        console.error("3D Scene: Error fetching data:", error);
        if (error instanceof TypeError)
          alert(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bounds, setBuildings, setLoading]);

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
              <BuildingCSG
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
      </Canvas>

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
              required
              min="0.01"
              step="0.5"
              value={coordinateScale}
              onChange={(e) => setCoordinateScale(Number(e.target.value))}
              className="w-full mt-1 p-1 border rounded text-sm"
            />
          </div>
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
