import * as turf from '@turf/turf';

/**
 * Creates a union of river features and clips them to the specified bounds
 */
export function processRiverDataUnion(data: any, bounds: { north: number; south: number; east: number; west: number }): any {
  const { elements = [] } = data || {};

  // Create a mapping of node IDs to coordinates
  const nodesMap = new Map();
  const originalWayElements: any[] = []; // Store way elements separately to handle different geometry types

  elements.forEach((element: any) => {
    if (element.type === 'node') {
      nodesMap.set(element.id, [element.lon, element.lat]);
    } else if (element.type === 'way') {
      originalWayElements.push(element);
    }
  });

  // Process ways to create features (both line strings and polygons for water areas)
  const lineFeatures: any[] = [];
  const areaFeatures: any[] = [];
  
  originalWayElements.forEach((element: any) => {
    if (element.nodes && element.nodes.length > 1) {
      const coords = element.nodes
        .map((nodeId: any) => nodesMap.get(nodeId))
        .filter((coord: any) => coord !== undefined);
      
      if (coords.length >= 2) {
        // Determine if this is a water area based on tags or if it's a closed loop
        let isWaterArea = false;
        let waterwayType = element.tags?.waterway || element.tags?.natural || 'river';
        
        if (element.tags?.natural === 'water' || element.tags?.waterway === 'riverbank' || 
            element.tags?.waterway === 'dock' || element.tags?.waterway === 'canal' || 
            element.tags?.natural === 'coastline') {
          isWaterArea = true;
        } 
        // Check if it's a closed loop (first and last coordinates are the same)
        else if (element.nodes.length > 2 && 
                 coords[0][0] === coords[coords.length - 1][0] && 
                 coords[0][1] === coords[coords.length - 1][1]) {
          isWaterArea = true;
        }
        
        if (isWaterArea && coords.length >= 3) {
          // Create a polygon for water areas
          try {
            // Close the polygon if not already closed (for safety)
            let polygonCoords = [...coords];
            if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] || 
                polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
              polygonCoords.push(polygonCoords[0]);
            }
            
            // Validate that we have at least 3 unique points for a valid polygon
            if (polygonCoords.length >= 4) { // Need at least 4 points for a closed polygon (3 unique + 1 closing)
              const polygon = turf.polygon([polygonCoords], {
                id: element.id,
                tags: element.tags || {},
                type: 'waterarea'
              });
              areaFeatures.push(polygon);
            } else {
              // If not enough points for a polygon, treat as line
              const lineString = turf.lineString(coords, {
                id: element.id,
                tags: element.tags || {},
                type: waterwayType
              });
              lineFeatures.push(lineString);
            }
          } catch (e) {
            // If polygon creation fails, treat as line
            const lineString = turf.lineString(coords, {
              id: element.id,
              tags: element.tags || {},
              type: waterwayType
            });
            lineFeatures.push(lineString);
          }
        } else if (coords.length >= 2) {
          // Create a line string for rivers/streams
          const lineString = turf.lineString(coords, {
            id: element.id,
            tags: element.tags || {},
            type: waterwayType
          });
          lineFeatures.push(lineString);
        }
      }
    }
  });

  // Create a bounding box polygon for clipping
  const bboxPolygon = turf.bboxPolygon([bounds.west, bounds.south, bounds.east, bounds.north]);

  // Process line features (rivers, streams) - keep as lines instead of converting to polygons
  let processedLineFeatures: any[] = [];
  for (const river of lineFeatures) {
    try {
      // Since we fetched data with a buffer, now we need to extract segments that are within or cross the bounds
      const coords = river.geometry.coordinates;
      const validSegments: [number, number][][] = [];
      
      // Create segments that properly handle boundary crossings by including intersection points
      let currentSegment: [number, number][] = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const current = coords[i];
        const next = coords[i + 1];
        
        // Determine if each point is inside bounds
        const currentInBounds = current[0] >= bounds.west && current[0] <= bounds.east &&
                               current[1] >= bounds.south && current[1] <= bounds.north;
        const nextInBounds = next[0] >= bounds.west && next[0] <= bounds.east &&
                            next[1] >= bounds.south && next[1] <= bounds.north;
        
        if (currentInBounds && nextInBounds) {
          // Both points in bounds, add the current point if not already in segment
          if (currentSegment.length === 0) {
            currentSegment.push(current);
          }
          currentSegment.push(next);
        } else if (currentInBounds && !nextInBounds) {
          // Current in bounds, next out of bounds - add intersection point
          if (currentSegment.length === 0) {
            currentSegment.push(current);
          }
          
          // Find intersection with boundary
          const intersection = findBoundaryIntersection(current, next, bounds);
          if (intersection) {
            currentSegment.push(intersection);
          }
          
          // Complete the segment if we have at least 2 points
          if (currentSegment.length >= 2) {
            validSegments.push([...currentSegment]);
          }
          currentSegment = []; // Start new segment on next iteration
        } else if (!currentInBounds && nextInBounds) {
          // Current out of bounds, next in bounds - start with intersection point
          const intersection = findBoundaryIntersection(current, next, bounds);
          if (intersection) {
            currentSegment.push(intersection);
          }
          currentSegment.push(next);
        } else if (!currentInBounds && !nextInBounds) {
          // Both points out of bounds - check if segment crosses the boundary
          const intersections = findBoundaryIntersections(current, next, bounds);
          if (intersections.length === 2) {
            // Segment crosses the bounds, add both intersection points as a segment
            validSegments.push([...intersections]);
          }
        }
        
        // On the last segment, if we still have points in currentSegment, save it
        if (i === coords.length - 2 && currentSegment.length >= 2) {
          validSegments.push([...currentSegment]);
          currentSegment = [];
        }
      }
      
      // Process each valid segment
      for (const segment of validSegments) {
        if (segment.length >= 2) {
          // Get the river width from tags (default to 5 meters if not specified)
          let width = 5; // default width in meters
          if (river.properties?.tags?.width) {
            const widthValue = parseFloat(river.properties.tags.width);
            if (!isNaN(widthValue) && widthValue > 0) {
              width = widthValue;
            }
          } else if (river.properties?.tags?.['waterway']) {
            // Set default widths based on waterway type
            const waterwayType = river.properties.tags['waterway'];
            switch (waterwayType) {
              case 'river':
                width = 20;
                break;
              case 'stream':
                width = 3;
                break;
              case 'canal':
                width = 15;
                break;
              case 'ditch':
                width = 1;
                break;
              case 'brook':
                width = 2;
                break;
              default:
                width = 5;
            }
          }
          
          // Keep as line string but add width information to properties
          processedLineFeatures.push({
            ...turf.lineString(segment, {
              ...river.properties,
              originalType: river.properties?.type || 'river',
              width: width
            })
          });
        }
      }
    } catch (e) {
      console.warn('Could not process line feature:', e);
    }
  }

  // Now perform union operation to merge connected river segments
  let unifiedRivers = [...processedLineFeatures];
  
  // Simple merging: combine connected segments
  let merged = true;
  while (merged) {
    merged = false;
    const newUnifiedRivers: any[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < unifiedRivers.length; i++) {
      if (used.has(i)) continue;
      
      let currentRiver = unifiedRivers[i];
      let mergedWithAnother = false;
      
      for (let j = i + 1; j < unifiedRivers.length; j++) {
        if (used.has(j)) continue;
        
        const otherRiver = unifiedRivers[j];
        
        // Check if the two rivers can be connected (end of one connects to start of another)
        const currentEnd = currentRiver.geometry.coordinates[currentRiver.geometry.coordinates.length - 1];
        const otherStart = otherRiver.geometry.coordinates[0];
        const currentStart = currentRiver.geometry.coordinates[0];
        const otherEnd = otherRiver.geometry.coordinates[otherRiver.geometry.coordinates.length - 1];
        
        // Define a small threshold for connection (in degrees)
        const threshold = 0.00005; // About 5-6 meters
        
        if (distance(currentEnd, otherStart) < threshold) {
          // Join: current -> other
          const newCoords = [...currentRiver.geometry.coordinates, ...otherRiver.geometry.coordinates.slice(1)];
          currentRiver = turf.lineString(newCoords, { ...currentRiver.properties, ...otherRiver.properties });
          used.add(j);
          mergedWithAnother = true;
          merged = true;
        } else if (distance(currentStart, otherEnd) < threshold) {
          // Join: other -> current
          const newCoords = [...otherRiver.geometry.coordinates, ...currentRiver.geometry.coordinates.slice(1)];
          currentRiver = turf.lineString(newCoords, { ...currentRiver.properties, ...otherRiver.properties });
          used.add(j);
          mergedWithAnother = true;
          merged = true;
        } else if (distance(currentEnd, otherEnd) < threshold) {
          // Connect end to end: current -> reverse(other)
          const reversedOtherCoords = [...otherRiver.geometry.coordinates].reverse();
          const newCoords = [...currentRiver.geometry.coordinates, ...reversedOtherCoords.slice(1)];
          currentRiver = turf.lineString(newCoords, { ...currentRiver.properties, ...otherRiver.properties });
          used.add(j);
          mergedWithAnother = true;
          merged = true;
        } else if (distance(currentStart, otherStart) < threshold) {
          // Connect start to start: reverse(current) -> other
          const reversedCurrentCoords = [...currentRiver.geometry.coordinates].reverse();
          const newCoords = [...reversedCurrentCoords, ...otherRiver.geometry.coordinates.slice(1)];
          currentRiver = turf.lineString(newCoords, { ...currentRiver.properties, ...otherRiver.properties });
          used.add(j);
          mergedWithAnother = true;
          merged = true;
        }
      }
      
      newUnifiedRivers.push(currentRiver);
      used.add(i);
    }
    
    unifiedRivers = newUnifiedRivers;
  }

  // Process area features (lakes, water bodies)
  const processedAreaFeatures: any[] = [];
  for (const waterArea of areaFeatures) {
    try {
      // Validate the water area geometry before attempting intersection
      if (!waterArea || !waterArea.geometry || !waterArea.geometry.coordinates || 
          waterArea.geometry.coordinates.length === 0) {
        console.warn('Skipping invalid water area geometry:', waterArea);
        continue;
      }
      
      // Additional validation for polygon coordinates
      if (waterArea.geometry.type === 'Polygon' && 
          waterArea.geometry.coordinates.length > 0 && 
          waterArea.geometry.coordinates[0].length < 3) {
        console.warn('Skipping polygon with insufficient coordinates:', waterArea);
        continue;
      } else if (waterArea.geometry.type === 'MultiPolygon' &&
                 waterArea.geometry.coordinates.length === 0) {
        console.warn('Skipping empty multipolygon:', waterArea);
        continue;
      }
      
      // Intersect water area with bounding box to clip it
      const clippedWater = turf.intersect(waterArea, bboxPolygon);
      if (clippedWater) {
        processedAreaFeatures.push(clippedWater);
      } else {
        // If intersection fails, check if the area centroid is within bounds
        try {
          const centroid = turf.centroid(waterArea);
          const [lon, lat] = centroid.geometry.coordinates;
          if (lon >= bounds.west && lon <= bounds.east && 
              lat >= bounds.south && lat <= bounds.north) {
            // Area is within bounds but intersection failed, so include as is
            processedAreaFeatures.push(waterArea);
          }
        } catch (centroidError) {
          console.warn('Could not calculate centroid for water area:', waterArea);
          // As a last resort, check if any of the coordinates are within bounds
          const hasCoordsInBounds = checkCoordinatesInBounds(waterArea.geometry.coordinates, bounds);
          if (hasCoordsInBounds) {
            processedAreaFeatures.push(waterArea);
          }
        }
      }
    } catch (e) {
      console.warn('Could not process area feature:', e);
      // Fallback: check if the area centroid is within bounds or any coordinates are in bounds
      try {
        const centroid = turf.centroid(waterArea);
        const [lon, lat] = centroid.geometry.coordinates;
        
        if (lon >= bounds.west && lon <= bounds.east && 
            lat >= bounds.south && lat <= bounds.north) {
          processedAreaFeatures.push(waterArea);
        } else {
          // Check if any coordinates of the area are within bounds as a last resort
          const hasCoordsInBounds = checkCoordinatesInBounds(waterArea.geometry.coordinates, bounds);
          if (hasCoordsInBounds) {
            processedAreaFeatures.push(waterArea);
          }
        }
      } catch (centroidError) {
        console.warn('Could not calculate centroid for water area:', waterArea);
        // As a last resort, check if any of the coordinates are within bounds
        const hasCoordsInBounds = checkCoordinatesInBounds(waterArea.geometry.coordinates, bounds);
        if (hasCoordsInBounds) {
          processedAreaFeatures.push(waterArea);
        }
      }
    }
  }

  // Combine all processed features
  const allProcessedFeatures = [...unifiedRivers, ...processedAreaFeatures];

  // Convert the unified features back to OSM format
  const nodeElements: any[] = [];
  const wayElements: any[] = [];
  
  allProcessedFeatures
    .filter((feature: any) => 
      feature?.geometry && 
      ((feature.geometry.type === 'LineString' && feature.geometry.coordinates.length >= 2) ||
       feature.geometry.type === 'Polygon')
    )
    .forEach((feature: any, index: number) => {
      const currentNodes: any[] = [];
      const nodeIds: string[] = [];
      
      if (feature.geometry.type === 'LineString') {
        // For line strings (rivers/streams), create nodes and way
        feature.geometry.coordinates.forEach((coord: [number, number], nodeIndex: number) => {
          const nodeId = `river-node-${index}-${nodeIndex}`;
          nodeIds.push(nodeId);
          currentNodes.push({
            type: 'node',
            id: nodeId,
            lat: coord[1],
            lon: coord[0]
          });
        });
        
        wayElements.push({
          type: 'way',
          id: `unified-river-${index}`,
          nodes: nodeIds,
          tags: { 
            ...feature.properties?.tags,
            'waterway': feature.properties?.originalType || feature.properties?.type || 'river',
            'name': feature.properties?.tags?.name || `Unified River ${index}`,
            'merged': true,
            'union': true
          },
        });
      } else if (feature.geometry.type === 'Polygon') {
        // For polygons (water areas and buffered rivers), create nodes and way
        // Extract the outer ring of the polygon (first array in coordinates)
        const outerRing = feature.geometry.coordinates[0];
        outerRing.forEach((coord: [number, number], nodeIndex: number) => {
          const nodeId = `water-area-node-${index}-${nodeIndex}`;
          nodeIds.push(nodeId);
          currentNodes.push({
            type: 'node',
            id: nodeId,
            lat: coord[1],
            lon: coord[0]
          });
        });
        
        // Determine the appropriate tag based on original type
        const originalType = feature.properties?.originalType;
        const tags: any = {
          ...feature.properties?.tags,
          'name': feature.properties?.tags?.name || `Water Area ${index}`,
        };

        if (originalType === 'river' || originalType === 'stream' || originalType === 'canal' || 
            feature.properties?.type === 'river_polygon') {
          tags['waterway'] = originalType || 'river';
          if (feature.properties?.width) {
            tags['width'] = feature.properties.width;  // Add width information back to tags
          }
        } else {
          tags['natural'] = 'water';
        }

        wayElements.push({
          type: 'way',
          id: `water-area-${index}`,
          nodes: nodeIds,
          tags: tags,
        });
      }
      
      nodeElements.push(...currentNodes);
    });

  return { elements: [...wayElements, ...nodeElements] };
}

// Helper function to calculate distance between two points
function distance(point1: [number, number], point2: [number, number]): number {
  const [x1, y1] = point1;
  const [x2, y2] = point2;
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Helper function to check if any coordinates in a geometry are within bounds
function checkCoordinatesInBounds(coordinates: any, bounds: { north: number; south: number; east: number; west: number }): boolean {
  if (!coordinates) return false;
  
  // Handle different geometry types
  if (Array.isArray(coordinates) && coordinates.length > 0) {
    // Check if it's a coordinate pair [lon, lat]
    if (coordinates.length === 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      const [lon, lat] = coordinates;
      return lon >= bounds.west && lon <= bounds.east && 
             lat >= bounds.south && lat <= bounds.north;
    }
    
    // Recursively check nested arrays
    for (const coord of coordinates) {
      if (checkCoordinatesInBounds(coord, bounds)) {
        return true;
      }
    }
  }
  
  return false;
}

// Helper function to find single boundary intersection point between two coordinates
function findBoundaryIntersection(start: [number, number], end: [number, number], bounds: { north: number; south: number; east: number; west: number }): [number, number] | null {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  
  if (dx === 0 && dy === 0) return null; // Same points
  
  // Check intersection with each boundary of the bbox
  // Left boundary (x = bounds.west)
  if (dx !== 0) {
    const t = (bounds.west - start[0]) / dx;
    if (t >= 0 && t <= 1) {
      const y = start[1] + t * dy;
      if (y >= bounds.south && y <= bounds.north) {
        return [bounds.west, y];
      }
    }
  }
  
  // Right boundary (x = bounds.east)  
  if (dx !== 0) {
    const t = (bounds.east - start[0]) / dx;
    if (t >= 0 && t <= 1) {
      const y = start[1] + t * dy;
      if (y >= bounds.south && y <= bounds.north) {
        return [bounds.east, y];
      }
    }
  }
  
  // Bottom boundary (y = bounds.south)
  if (dy !== 0) {
    const t = (bounds.south - start[1]) / dy;
    if (t >= 0 && t <= 1) {
      const x = start[0] + t * dx;
      if (x >= bounds.west && x <= bounds.east) {
        return [x, bounds.south];
      }
    }
  }
  
  // Top boundary (y = bounds.north)
  if (dy !== 0) {
    const t = (bounds.north - start[1]) / dy;
    if (t >= 0 && t <= 1) {
      const x = start[0] + t * dx;
      if (x >= bounds.west && x <= bounds.east) {
        return [x, bounds.north];
      }
    }
  }
  
  return null;
}

// Helper function to find all boundary intersection points between two coordinates
function findBoundaryIntersections(start: [number, number], end: [number, number], bounds: { north: number; south: number; east: number; west: number }): [number, number][] {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  
  if (dx === 0 && dy === 0) return []; // Same points
  
  let intersections: [number, number][] = [];
  
  // Check intersection with each boundary of the bbox
  // Left boundary (x = bounds.west)
  if (dx !== 0) {
    const t = (bounds.west - start[0]) / dx;
    if (t >= 0 && t <= 1) {
      const y = start[1] + t * dy;
      if (y >= bounds.south && y <= bounds.north) {
        intersections.push([bounds.west, y]);
      }
    }
  }
  
  // Right boundary (x = bounds.east)  
  if (dx !== 0) {
    const t = (bounds.east - start[0]) / dx;
    if (t >= 0 && t <= 1) {
      const y = start[1] + t * dy;
      if (y >= bounds.south && y <= bounds.north) {
        intersections.push([bounds.east, y]);
      }
    }
  }
  
  // Bottom boundary (y = bounds.south)
  if (dy !== 0) {
    const t = (bounds.south - start[1]) / dy;
    if (t >= 0 && t <= 1) {
      const x = start[0] + t * dx;
      if (x >= bounds.west && x <= bounds.east) {
        intersections.push([x, bounds.south]);
      }
    }
  }
  
  // Top boundary (y = bounds.north)
  if (dy !== 0) {
    const t = (bounds.north - start[1]) / dy;
    if (t >= 0 && t <= 1) {
      const x = start[0] + t * dx;
      if (x >= bounds.west && x <= bounds.east) {
        intersections.push([x, bounds.north]);
      }
    }
  }
  
  // Remove duplicate intersections
  return intersections.filter((point, index, self) => 
    index === self.findIndex(p => 
      Math.abs(p[0] - point[0]) < 0.000001 && 
      Math.abs(p[1] - point[1]) < 0.000001
    )
  );
}



