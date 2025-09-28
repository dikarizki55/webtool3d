"use client";

import * as THREE from "three";
import { useThreeDScene } from "../contexts/ThreeDSceneContext";

// Scale factor for converting lat/lon to 3D coordinates
const HEIGHT_SCALE = 1; // Height scale (1:1 for meters)

interface BaseRectangleProps {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  height: number;
}

// Base Rectangle Component
export default function BaseRectangle({ bounds, height }: BaseRectangleProps) {
  const { calcScale } = useThreeDScene();
  // Create a rectangle shape for the base using the actual bounds
  const shape = new THREE.Shape();

  // Convert lat/lng bounds to a simple 2D rectangle with better projection
  const centerLon = (bounds.east + bounds.west) / 2;
  const centerLat = (bounds.north + bounds.south) / 2;

  // OSM coordinates are [longitude, latitude], which we map to [x, y]
  // Using 1:100 scale where 1 degree ≈ 111,111 meters at equator
  const west = (bounds.west - centerLon) * calcScale; // longitude -> x
  const east = (bounds.east - centerLon) * calcScale; // longitude -> x
  const north = (bounds.north - centerLat) * calcScale; // latitude -> y
  const south = (bounds.south - centerLat) * calcScale; // latitude -> y

  shape.moveTo(west, south);
  shape.lineTo(east, south);
  shape.lineTo(east, north);
  shape.lineTo(west, north);
  shape.closePath();

  const extrudeSettings = {
    depth: height,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Position at height/2 on Y axis (after rotation this will be Z axis upward)
  // Position the base so that its bottom is at Y=0
  return (
    <mesh position={[0, 0, 0]} geometry={geometry}>
      <meshStandardMaterial color="#E6BB92" opacity={1} />
    </mesh>
  );
}
