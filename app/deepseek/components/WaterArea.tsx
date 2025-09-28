"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import * as turf from "@turf/turf";

// Scale factor for converting lat/lon to 3D coordinates
const COORDINATE_SCALE = 10000; // 1:100 scale
const HEIGHT_SCALE = 1; // Height scale (1:1 for meters)

interface WaterAreaData {
  coordinates: [number, number][];
  width?: number;
  type: "line" | "polygon";
  waterwayType?: string;
  id: string;
}

interface WaterAreaProps {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  height: number;
  data: WaterAreaData;
  widthScale: number;
  waterwayType?: string;
}

// Water Area Component - handles both rivers (lines converted to polygons) and water bodies (polygons)
export default function WaterArea({
  bounds,
  height,
  data,
  widthScale,
  waterwayType, // New prop to control waterway display type
}: WaterAreaProps) {
  const centerLon = (bounds.east + bounds.west) / 2;
  const centerLat = (bounds.north + bounds.south) / 2;

  if (!data || !data.coordinates || data.coordinates.length < 2) {
    // Create a placeholder water area
    const shape = new THREE.Shape();
    const west = (bounds.west - centerLon) * COORDINATE_SCALE + 10;
    const east = (bounds.east - centerLon) * COORDINATE_SCALE - 10;
    const north = (bounds.north - centerLat) * COORDINATE_SCALE - 10;
    const south = (bounds.south - centerLat) * COORDINATE_SCALE + 10;

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
    return (
      <mesh position={[0, height / 2, 0]}>
        <meshStandardMaterial color="#4682B4" transparent opacity={0.7} />
        <primitive object={geometry} attach="geometry" />
      </mesh>
    );
  }

  const { coordinates, width, type } = data;

  // Determine if this is a line type waterway (river, stream, canal, drain, ditch, brook) based on waterwayType
  const isLineTypeWaterway = data.waterwayType && 
    (data.waterwayType === "river" || 
     data.waterwayType === "stream" || 
     data.waterwayType === "canal" ||
     data.waterwayType === "drain" || 
     data.waterwayType === "ditch" ||
     data.waterwayType === "brook");

  // Filter coordinates to ensure they are within or close to the bounds
  // This ensures proper alignment with the clipping applied in the API
  let filteredCoordinates = coordinates.filter(([lon, lat]) => {
    // Include coordinates that are within bounds or slightly outside to account for buffer
    // Add a small tolerance to handle floating point precision issues
    const tolerance = 0.0005; // This is approximately 55 meters at the equator to account for larger buffer
    return (
      lon >= bounds.west - tolerance &&
      lon <= bounds.east + tolerance &&
      lat >= bounds.south - tolerance &&
      lat <= bounds.north + tolerance
    );
  });

  if (filteredCoordinates.length < 2) {
    return null; // Not enough points to create a valid geometry after filtering
  }

  if (isLineTypeWaterway && type === "line" && filteredCoordinates.length >= 2) {
    // Handle line type waterways (rivers, streams, canals) - rendered as lines with width
    try {
      // Calculate the actual width to use - either from data or default
      const actualWidth = width || 5; // Default width in meters
      const scaledWidth = actualWidth * widthScale; // Apply width scale factor

      // Extend the river at both ends to make it longer
      let extendedCoordinates = [...filteredCoordinates];

      if (extendedCoordinates.length >= 2) {
        const firstPoint = extendedCoordinates[0];
        const secondPoint = extendedCoordinates[1];
        const lastPoint = extendedCoordinates[extendedCoordinates.length - 1];
        const secondLastPoint =
          extendedCoordinates[extendedCoordinates.length - 2];

        // Calculate extension distance in degrees (0.0001 is approximately 11.1 meters at the equator)
        const extensionDistance = 0.0002; // Increase this value to make rivers longer

        // Extend at the beginning
        const firstDirX = firstPoint[0] - secondPoint[0];
        const firstDirY = firstPoint[1] - secondPoint[1];
        const firstDirLength = Math.sqrt(
          firstDirX * firstDirX + firstDirY * firstDirY
        );
        if (firstDirLength > 0) {
          const normalizedFirstDirX = firstDirX / firstDirLength;
          const normalizedFirstDirY = firstDirY / firstDirY;
          const extendedFirstX =
            firstPoint[0] + normalizedFirstDirX * extensionDistance;
          const extendedFirstY =
            firstPoint[1] + normalizedFirstDirY * extensionDistance;
          extendedCoordinates.unshift([extendedFirstX, extendedFirstY]);
        }

        // Extend at the end
        const lastDirX = lastPoint[0] - secondLastPoint[0];
        const lastDirY = lastPoint[1] - secondLastPoint[1];
        const lastDirLength = Math.sqrt(
          lastDirX * lastDirX + lastDirY * lastDirY
        );
        if (lastDirLength > 0) {
          const normalizedLastDirX = lastDirX / lastDirLength;
          const normalizedLastDirY = lastDirY / lastDirLength;
          const extendedLastX =
            lastPoint[0] + normalizedLastDirX * extensionDistance;
          const extendedLastY =
            lastPoint[1] + normalizedLastDirY * extensionDistance;
          extendedCoordinates.push([extendedLastX, extendedLastY]);
        }
      }

      // Create a line from the extended coordinates using Turf.js
      const line = turf.lineString(extendedCoordinates);

      // Calculate width in degrees for the buffer operation
      // 1 degree latitude ≈ 111320 meters everywhere
      // 1 degree longitude ≈ 111320 * cos(latitude) meters (shrinks towards poles)
      // For simplicity, we'll calculate an average conversion based on the center latitude of the river
      const avgLat =
        extendedCoordinates.reduce(
          (sum: number, coord: [number, number]) => sum + coord[1],
          0
        ) / extendedCoordinates.length;
      const metersPerDegreeLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
      // Use the smaller of lat and lng conversion to ensure the river is wide enough
      const metersPerDegree = Math.min(111320, metersPerDegreeLng);
      const widthInDegrees = scaledWidth / metersPerDegree;

      // Create a buffer around the line to make it a polygon
      const bufferedRiver = turf.buffer(line, widthInDegrees, {
        units: "degrees",
      });

      if (
        bufferedRiver &&
        bufferedRiver.geometry &&
        bufferedRiver.geometry.coordinates
      ) {
        // Extract the buffered polygon coordinates
        const bufferedCoordsArray = bufferedRiver.geometry.coordinates[0]; // Outer ring
        const bufferedCoords: [number, number][] = bufferedCoordsArray.map(
          (coord: any) => [coord[0], coord[1]]
        );

        // Filter the buffered coordinates to ensure they are within or close to the bounds
        const filteredBufferedCoords = bufferedCoords.filter(([lon, lat]) => {
          const tolerance = 0.0001; // Small tolerance for floating point precision
          return (
            lon >= bounds.west - tolerance &&
            lon <= bounds.east + tolerance &&
            lat >= bounds.south - tolerance &&
            lat <= bounds.north + tolerance
          );
        });

        if (filteredBufferedCoords.length < 3) {
          return null; // Not enough points to create a valid polygon after filtering
        }

        const shape = new THREE.Shape();
        const firstPoint = filteredBufferedCoords[0];
        // Use the same centerLon and centerLat as the rest of the scene
        const x1 = (firstPoint[0] - centerLon) * COORDINATE_SCALE; // longitude -> x
        const y1 = (firstPoint[1] - centerLat) * COORDINATE_SCALE; // latitude -> y
        shape.moveTo(x1, y1);

        for (let i = 1; i < filteredBufferedCoords.length; i++) {
          const x =
            (filteredBufferedCoords[i][0] - centerLon) * COORDINATE_SCALE; // longitude -> x
          const y =
            (filteredBufferedCoords[i][1] - centerLat) * COORDINATE_SCALE; // latitude -> y
          shape.lineTo(x, y);
        }

        shape.closePath();

        const extrudeSettings = {
          depth: height,
          bevelEnabled: false,
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Position at height on Y axis (after rotation this will be Z axis upward)
        return (
          <mesh position={[0, height / 2, 0]}>
            <meshStandardMaterial 
              color="#4682B4" 
              transparent 
              opacity={0.7} 
            />
            <primitive object={geometry} attach="geometry" />
          </mesh>
        );
      } else {
        // If buffer fails, fall back to a simple polygon representation based on line
        // This is just a fallback - create a very thin polygon
        const shape = new THREE.Shape();
        const firstPoint = extendedCoordinates[0];
        const x1 = (firstPoint[0] - centerLon) * COORDINATE_SCALE; // longitude -> x
        const y1 = (firstPoint[1] - centerLat) * COORDINATE_SCALE; // latitude -> y
        shape.moveTo(x1, y1);

        for (let i = 1; i < extendedCoordinates.length; i++) {
          const x = (extendedCoordinates[i][0] - centerLon) * COORDINATE_SCALE; // longitude -> x
          const y = (extendedCoordinates[i][1] - centerLat) * COORDINATE_SCALE; // latitude -> y
          shape.lineTo(x, y);
        }

        shape.closePath();

        const extrudeSettings = {
          depth: height,
          bevelEnabled: false,
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Position at height on Y axis (after rotation this will be Z axis upward)
        return (
          <mesh position={[0, height / 2, 0]}>
            <meshStandardMaterial 
              color="#4682B4" 
              transparent 
              opacity={0.7} 
            />
            <primitive object={geometry} attach="geometry" />
          </mesh>
        );
      }
    } catch (e) {
      console.error("Error creating buffered river polygon:", e);
      // Fallback to creating a simple representation
      const shape = new THREE.Shape();
      const firstPoint = filteredCoordinates[0];
      const x1 = (firstPoint[0] - centerLon) * COORDINATE_SCALE; // longitude -> x
      const y1 = (firstPoint[1] - centerLat) * COORDINATE_SCALE; // latitude -> y
      shape.moveTo(x1, y1);

      for (let i = 1; i < filteredCoordinates.length; i++) {
        const x = (filteredCoordinates[i][0] - centerLon) * COORDINATE_SCALE; // longitude -> x
        const y = (filteredCoordinates[i][1] - centerLat) * COORDINATE_SCALE; // latitude -> y
        shape.lineTo(x, y);
      }

      shape.closePath();

      const extrudeSettings = {
        depth: height,
        bevelEnabled: false,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      // Position at height on Y axis (after rotation this will be Z axis upward)
      return (
        <mesh position={[0, height / 2, 0]}>
          <meshStandardMaterial 
            color="#4682B4" 
            transparent 
            opacity={0.7} 
          />
          <primitive object={geometry} attach="geometry" />
        </mesh>
      );
    }
  } else if (type === "polygon" && filteredCoordinates.length >= 3) {
    // Handle polygon data (water bodies, lakes, etc.) - keep as is
    const shape = new THREE.Shape();
    const firstPoint = filteredCoordinates[0];
    const lastPoint = filteredCoordinates[filteredCoordinates.length - 1];
    const isClosed =
      firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];

    const x1 = (firstPoint[0] - centerLon) * COORDINATE_SCALE; // longitude -> x
    const y1 = (firstPoint[1] - centerLat) * COORDINATE_SCALE; // latitude -> y
    shape.moveTo(x1, y1);

    for (let i = 1; i < filteredCoordinates.length - (isClosed ? 1 : 0); i++) {
      // Skip the last point if closed since it's the same as the first
      const x = (filteredCoordinates[i][0] - centerLon) * COORDINATE_SCALE; // longitude -> x
      const y = (filteredCoordinates[i][1] - centerLat) * COORDINATE_SCALE; // latitude -> y
      shape.lineTo(x, y);
    }

    if (isClosed) {
      shape.closePath();
    }

    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Position at height on Y axis (after rotation this will be Z axis upward)
    return (
      <mesh position={[0, height / 2, 0]}>
        <meshStandardMaterial 
          color="#1E90FF" 
          transparent 
          opacity={0.8} 
        />
        <primitive object={geometry} attach="geometry" />
      </mesh>
    );
  } else if (type === "line" && filteredCoordinates.length >= 2 && !isLineTypeWaterway) {
    // Handle other line data (non-river waterways) that should be rendered as extruded polygon shapes
    const shape = new THREE.Shape();
    const firstPoint = filteredCoordinates[0];
    const x1 = (firstPoint[0] - centerLon) * COORDINATE_SCALE; // longitude -> x
    const y1 = (firstPoint[1] - centerLat) * COORDINATE_SCALE; // latitude -> y
    shape.moveTo(x1, y1);

    for (let i = 1; i < filteredCoordinates.length; i++) {
      const x = (filteredCoordinates[i][0] - centerLon) * COORDINATE_SCALE; // longitude -> x
      const y = (filteredCoordinates[i][1] - centerLat) * COORDINATE_SCALE; // latitude -> y
      shape.lineTo(x, y);
    }

    shape.closePath(); // Close the shape to create a polygon

    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Position at height on Y axis (after rotation this will be Z axis upward)
    return (
      <mesh position={[0, height / 2, 0]}>
        <meshStandardMaterial 
          color="#87CEEB" 
          transparent 
          opacity={0.75} 
        />
        <primitive object={geometry} attach="geometry" />
      </mesh>
    );
  }

  return null; // Return null if no valid coordinates
}