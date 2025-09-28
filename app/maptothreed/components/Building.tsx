"use client";

interface BuildingData {
  id: string;
  coordinates: [number, number][];
  height: number;
  color: string;
}

interface BuildingProps {
  data: BuildingData;
  isSelected: boolean;
  onClick: () => void;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  baseHeight: number;
}

const HEIGHT_SCALE = 1; // Height scale (1:1 for meters)

import { useMemo } from "react";
import * as THREE from "three";
import { CSG } from "three-csg-ts";
import { createClippingBox } from "../utils/createClippingBox";
import { useThreeDScene } from "../contexts/ThreeDSceneContext";

export default function BuildingCSG({
  data,
  isSelected,
  onClick,
  bounds, // Add bounds prop to calculate absolute position
  baseHeight,
}: BuildingProps) {
  const { calcScale } = useThreeDScene();

  const mesh = useMemo(() => {
    if (!data.coordinates?.length) return null;

    // Buat shape bangunan
    const shape = new THREE.Shape();
    data.coordinates.forEach(([lon, lat], i) => {
      const x = (lon - (bounds.east + bounds.west) / 2) * calcScale;
      const y = (lat - (bounds.north + bounds.south) / 2) * calcScale;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: (data.height || 3) * HEIGHT_SCALE,
      bevelEnabled: false,
    });

    const buildingMesh = new THREE.Mesh(geometry);

    // Buat box clipping dari bounds
    const clippingBox = createClippingBox(bounds, calcScale, 10000);

    // Lakukan intersection CSG → hasil tertutup
    const result = CSG.intersect(buildingMesh, clippingBox);
    result.updateMatrixWorld();

    return result.geometry;
  }, [data, bounds, calcScale]);

  if (!mesh) return null;

  return (
    <mesh
      geometry={mesh}
      name={`building-${data.id}`}
      userData={{ buildingId: data.id }}
      position={[0, 0, baseHeight]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      <meshStandardMaterial
        color={!isSelected ? data.color : "#ffff00"}
        transparent
        opacity={isSelected ? 0.8 : 1}
      />
    </mesh>
  );
}
