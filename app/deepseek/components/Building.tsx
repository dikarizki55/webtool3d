"use client";

// import * as THREE from "three";

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

// Scale factor for converting lat/lon to 3D coordinates
// const COORDINATE_SCALE = 10000; // 1:100 scale
const HEIGHT_SCALE = 1; // Height scale (1:1 for meters)

// // Building Component
// export default function Building({
//   data,
//   isSelected,
//   onClick,
//   bounds, // Add bounds prop to calculate absolute position
//   baseHeight,
// }: BuildingProps) {
//   // console.log("3D Scene: Creating geometry for building", data.id);

//   // Skip buildings with too many coordinates to prevent performance issues
//   // if (data.coordinates && data.coordinates.length > 50) {
//   //   console.warn(
//   //     "3D Scene: Skipping building",
//   //     data.id,
//   //     "with",
//   //     data.coordinates.length,
//   //     "coordinates (too complex)"
//   //   );
//   //   return null;
//   // }

//   // Create geometry from coordinates
//   const shape = new THREE.Shape();
//   let buildingCenterX = 0;
//   let buildingCenterY = 0;

//   if (data.coordinates && data.coordinates.length > 0) {
//     // console.log(
//     //   "3D Scene: Building",
//     //   data.id,
//     //   "has",
//     //   data.coordinates.length,
//     //   "coordinates"
//     // );

//     // Filter coordinates to ensure they are within or close to the bounds
//     // This ensures proper alignment with the clipping applied in the API
//     const tolerance = 0.0005; // Larger tolerance to account for increased buffer size
//     const filteredCoordinates = data.coordinates.filter(([lon, lat]) => {
//       return (
//         lon >= bounds.west - tolerance &&
//         lon <= bounds.east + tolerance &&
//         lat >= bounds.south - tolerance &&
//         lat <= bounds.north + tolerance
//       );
//     });

//     // Skip buildings that have no coordinates within the bounds after filtering
//     if (filteredCoordinates.length === 0) {
//       return null;
//     }

//     // Skip buildings that have only 1 coordinate (can't form a shape)
//     if (filteredCoordinates.length < 2) {
//       // console.warn(
//       //   "3D Scene: Building",
//       //   data.id,
//       //   "has only 1 coordinate after filtering, skipping"
//       // );
//       return null;
//     }

//     // Check if all coordinates are the same point (can't form a valid polygon)
//     const uniqueCoords = new Set(
//       filteredCoordinates.map((coord) => `${coord[0]},${coord[1]}`)
//     );
//     if (uniqueCoords.size < 2) {
//       // console.warn(
//       //   "3D Scene: Building",
//       //   data.id,
//       //   "has all same coordinates, skipping"
//       // );
//       return null;
//     }

//     if (filteredCoordinates.length < 2) {
//       // console.warn(
//       //   "3D Scene: Building",
//       //   data.id,
//       //   "has fewer than 2 coordinates, skipping"
//       // );
//       return null; // Skip buildings with too few coordinates
//     }

//     // Calculate building center based on filtered coordinates
//     let centerLon = 0,
//       centerLat = 0;
//     filteredCoordinates.forEach((coord) => {
//       centerLon += coord[0]; // longitude
//       centerLat += coord[1]; // latitude
//     });
//     centerLon /= filteredCoordinates.length;
//     centerLat /= filteredCoordinates.length;

//     // Use the same coordinate system as BaseRectangle
//     const globalCenterLon = (bounds.east + bounds.west) / 2;
//     const globalCenterLat = (bounds.north + bounds.south) / 2;

//     // Calculate building's absolute position in the same coordinate system as base
//     // Normal XY coordinate system: X=longitude, Y=latitude
//     buildingCenterX = (centerLon - globalCenterLon) * COORDINATE_SCALE;
//     buildingCenterY = (centerLat - globalCenterLat) * COORDINATE_SCALE;

//     // Create the building shape relative to its own center (same approach as base)
//     const firstPoint = filteredCoordinates[0];
//     const x1 = (firstPoint[0] - centerLon) * COORDINATE_SCALE; // longitude -> x
//     const y1 = (firstPoint[1] - centerLat) * COORDINATE_SCALE; // latitude -> y
//     shape.moveTo(x1, y1);

//     for (let i = 1; i < filteredCoordinates.length; i++) {
//       const x = (filteredCoordinates[i][0] - centerLon) * COORDINATE_SCALE; // longitude -> x
//       const y = (filteredCoordinates[i][1] - centerLat) * COORDINATE_SCALE; // latitude -> y
//       shape.lineTo(x, y);
//     }

//     shape.closePath();
//   } else {
//     // console.warn("3D Scene: Building", data.id, "has no coordinates");
//     return null;
//   }

//   // Extrude settings
//   const height = data.height || 3;
//   const extrudeSettings = {
//     depth: height,
//     bevelEnabled: false,
//   };

//   // Create geometry
//   const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
//   // console.log(
//   //   "3D Scene: Created geometry for building",
//   //   data.id,
//   //   "with height",
//   //   data.height,
//   //   "data",
//   //   data
//   // );

//   // Position the building at its correct X,Y location with Z at height/2
//   // This positions the center of the extruded building at the correct height
//   // The extrusion goes from Z=0 to Z=height, so center is at Z=height/2
//   // After group rotation, this will be the correct vertical position
//   // console.log(`Building ${data.id} position:`, {
//   //   x: buildingCenterX,
//   //   y: buildingCenterY,
//   //   z: height / 2,
//   // });

//   return (
// <mesh
//   name={`building-${data.id}`}
//   userData={{ buildingId: data.id }}
//   position={[buildingCenterX, buildingCenterY, baseHeight]}
//   geometry={geometry}
//   onClick={(e) => {
//     e.stopPropagation();
//     onClick();
//   }}
//   onPointerOver={(e) => {
//     e.stopPropagation();
//     document.body.style.cursor = "pointer";
//   }}
//   onPointerOut={() => (document.body.style.cursor = "default")}
// >
//   <meshStandardMaterial
//     color={!isSelected ? data.color : "#ffff00"}
//     transparent
//     opacity={isSelected ? 0.8 : 1}
//   />
// </mesh>
//   );
// }

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
    const clippingBox = createClippingBox(bounds, calcScale, 1000);

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
