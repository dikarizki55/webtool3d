import * as turf from '@turf/turf';

/**
 * Processes river data by creating a union of all river features and clipping them to the specified bounds
 * @param data The raw OSM data containing river features
 * @param bounds Object with north, south, east, west properties defining the clipping bounds
 * @returns Processed GeoJSON FeatureCollection with unified and clipped river features
 */
export function processRiverDataReliable(data: any, bounds: { north: number; south: number; east: number; west: number }): any {
  // Extract ways and nodes from OSM data
  const { elements = [] } = data || {};

  // Create a mapping of node IDs to coordinates for building ways
  const nodesMap = new Map();
  elements.forEach((element: any) => {
    if (element.type === 'node') {
      nodesMap.set(element.id, [element.lon, element.lat]);
    }
  });

  // Process ways to create line features
  const lineStrings: any[] = [];
  
  elements.forEach((element: any) => {
    if (element.type === 'way' && element.nodes && element.nodes.length > 1) {
      // Convert OSM way to GeoJSON LineString
      const coords = element.nodes
        .map((nodeId: any) => nodesMap.get(nodeId))
        .filter((coord: any) => coord !== undefined);
      
      if (coords.length >= 2) {
        const lineString = turf.lineString(coords, {
          id: element.id,
          tags: element.tags || {},
          type: element.tags?.waterway || element.tags?.natural || 'river'
        });
        
        lineStrings.push(lineString);
      }
    }
  });

  if (lineStrings.length === 0) {
    return { elements: [] };
  }

  // Create a bounding box polygon for clipping
  const bboxPolygon = turf.bboxPolygon([bounds.west, bounds.south, bounds.east, bounds.north]);

  try {
    // Merge/union all the line strings that are connected
    let unionedLines: any[] = [...lineStrings];
    
    // Attempt to merge connected river segments
    // We'll try to create a MultiLineString and then potentially dissolve
    let mergedFeature: any = null;
    
    if (unionedLines.length === 1) {
      mergedFeature = unionedLines[0];
    } else {
      // Combine all lines into a MultiLineString if possible
      const allCoords = unionedLines.flatMap(feature => feature.geometry.coordinates);
      if (allCoords.length > 0) {
        mergedFeature = turf.lineString(allCoords, { type: 'merged-river-system' });
      } else {
        // If the above doesn't work, keep as separate lines
        mergedFeature = turf.featureCollection(unionedLines);
      }
    }

    // Now clip all features to the bbox
    const clippedFeatures: any[] = [];
    
    // Process either the single merged feature or the collection
    if (mergedFeature?.geometry?.type === 'LineString') {
      // Process a single line string
      try {
        const clipped = turf.lineSlice(
          turf.nearestPointOnLine(mergedFeature, turf.point([bounds.west, bounds.south])),
          turf.nearestPointOnLine(mergedFeature, turf.point([bounds.east, bounds.north])),
          mergedFeature
        );
        
        // Alternative approach: intersect with bbox
        const intersected = turf.lineIntersect(mergedFeature, bboxPolygon);
        if (intersected && intersected.features.length > 0) {
          // Extract line segments that are within the bounding box
          const coords = mergedFeature.geometry.coordinates.filter((coord: [number, number]) => {
            const [lon, lat] = coord;
            return lon >= bounds.west && lon <= bounds.east && 
                   lat >= bounds.south && lat <= bounds.north;
          });
          
          if (coords.length >= 2) {
            clippedFeatures.push(turf.lineString(coords, mergedFeature.properties));
          }
        }
      } catch (e) {
        // If lineSlice fails, fall back to coordinate filtering
        const coords = mergedFeature.geometry.coordinates.filter((coord: [number, number]) => {
          const [lon, lat] = coord;
          return lon >= bounds.west && lon <= bounds.east && 
                 lat >= bounds.south && lat <= bounds.north;
        });
        
        if (coords.length >= 2) {
          clippedFeatures.push(turf.lineString(coords, mergedFeature.properties));
        }
      }
    } else if (mergedFeature?.type === 'FeatureCollection') {
      // Process each feature in the collection
      mergedFeature.features.forEach((feature: any) => {
        if (feature?.geometry?.type === 'LineString') {
          try {
            // Filter coordinates to only include those within bounds
            const coords = feature.geometry.coordinates.filter((coord: [number, number]) => {
              const [lon, lat] = coord;
              return lon >= bounds.west && lon <= bounds.east && 
                     lat >= bounds.south && lat <= bounds.north;
            });
            
            if (coords.length >= 2) {
              clippedFeatures.push(turf.lineString(coords, feature.properties));
            }
          } catch (e) {
            console.warn('Could not process feature:', e);
          }
        }
      });
    }

    // Create final result in OSM format
    const processedElements = clippedFeatures
      .filter(feature => 
        feature?.geometry && 
        feature.geometry.type === 'LineString' && 
        feature.geometry.coordinates.length >= 2
      )
      .map((feature, index) => {
        return {
          type: 'way',
          id: `unified-river-${index}`,
          nodes: feature.geometry.coordinates.map((coord: [number, number], nodeIndex: number) => ({
            id: `unified-node-${index}-${nodeIndex}`,
            lat: coord[1],
            lon: coord[0]
          })),
          tags: { 
            ...feature.properties,
            'waterway': feature.properties?.type || 'river',
            'name': feature.properties?.name || `Unified River ${index}`
          },
        };
      });

    return { elements: processedElements };
  } catch (error) {
    console.error('Error in processRiverDataReliable:', error);
    
    // If processing fails, return the original data
    return data;
  }
}

/**
 * Alternative implementation: Simple coordinate-based clipping for rivers
 */
export function processRiverDataSimple(data: any, bounds: { north: number; south: number; east: number; west: number }): any {
  // Extract ways and nodes from OSM data
  const { elements = [] } = data || {};

  // Create a mapping of node IDs to coordinates for building ways
  const nodesMap = new Map();
  elements.forEach((element: any) => {
    if (element.type === 'node') {
      nodesMap.set(element.id, [element.lon, element.lat]);
    }
  });

  // Process ways and clip to bounds
  const processedElements: any[] = [];
  
  elements.forEach((element: any, index: number) => {
    if (element.type === 'way' && element.nodes && element.nodes.length > 1) {
      // Convert OSM way to coordinates
      const coords = element.nodes
        .map((nodeId: any) => nodesMap.get(nodeId))
        .filter((coord: any) => coord !== undefined);
      
      if (coords.length >= 2) {
        // Filter coordinates to only include those within bounds
        const filteredCoords = coords.filter(([lon, lat]: [number, number]) => {
          return lon >= bounds.west && lon <= bounds.east && 
                 lat >= bounds.south && lat <= bounds.north;
        });
        
        // Only include ways that have at least 2 points within bounds
        if (filteredCoords.length >= 2) {
          processedElements.push({
            type: 'way',
            id: element.id,
            nodes: filteredCoords.map((coord: [number, number], nodeIndex: number) => ({
              id: `clipped-node-${index}-${nodeIndex}`,
              lat: coord[1],
              lon: coord[0]
            })),
            tags: element.tags || {},
          });
        }
      }
    }
  });

  return { elements: processedElements };
}

/**
 * Advanced implementation: Creates true unions of connected river segments
 */
export function processRiverDataAdvanced(data: any, bounds: { north: number; south: number; east: number; west: number }): any {
  // Extract ways and nodes from OSM data
  const { elements = [] } = data || {};

  // Create a mapping of node IDs to coordinates for building ways
  const nodesMap = new Map();
  const wayNodesMap = new Map(); // Store the node sequence for each way
  
  elements.forEach((element: any) => {
    if (element.type === 'node') {
      nodesMap.set(element.id, [element.lon, element.lat]);
    } else if (element.type === 'way') {
      wayNodesMap.set(element.id, element.nodes);
    }
  });

  // Create line strings from the ways
  const lineStrings: { feature: any; element: any }[] = [];
  
  elements.forEach((element: any) => {
    if (element.type === 'way' && element.nodes && element.nodes.length > 1) {
      const coords = element.nodes
        .map((nodeId: any) => nodesMap.get(nodeId))
        .filter((coord: any) => coord !== undefined);
      
      if (coords.length >= 2) {
        const feature = turf.lineString(coords, {
          id: element.id,
          tags: element.tags || {},
          type: element.tags?.waterway || element.tags?.natural || 'river'
        });
        
        lineStrings.push({ feature, element });
      }
    }
  });

  if (lineStrings.length === 0) {
    return { elements: [] };
  }

  // Create a bounding box polygon for clipping
  const bboxPolygon = turf.bboxPolygon([bounds.west, bounds.south, bounds.east, bounds.north]);

  try {
    // Collect all river segments after clipping them to bounds
    const clippedSegments: any[] = [];
    
    for (const { feature, element } of lineStrings) {
      try {
        // Clip the line to the bounding box
        const lineWithinBounds = turf.lineSlice(
          turf.point([bounds.west, (bounds.south + bounds.north) / 2]),
          turf.point([bounds.east, (bounds.south + bounds.north) / 2]),
          feature
        );

        // Alternative: use intersect method
        const intersection = turf.lineIntersect(feature, bboxPolygon);
        
        if (intersection && intersection.features.length > 0) {
          // If there are intersections, try to get the lines within bounds
          const coords = feature.geometry.coordinates.filter((coord: [number, number]) => {
            const [lon, lat] = coord;
            return lon >= bounds.west && lon <= bounds.east && 
                   lat >= bounds.south && lat <= bounds.north;
          });
          
          if (coords.length >= 2) {
            clippedSegments.push(turf.lineString(coords, feature.properties));
          }
        } else {
          // If no intersection but some points might be within bounds
          const coords = feature.geometry.coordinates.filter((coord: [number, number]) => {
            const [lon, lat] = coord;
            return lon >= bounds.west && lon <= bounds.east && 
                   lat >= bounds.south && lat <= bounds.north;
          });
          
          if (coords.length >= 2) {
            clippedSegments.push(turf.lineString(coords, feature.properties));
          }
        }
      } catch (clipError) {
        console.warn('Could not clip feature, using coordinate filtering:', element.id);
        // Fallback: manual coordinate filtering
        try {
          const coords = feature.geometry.coordinates.filter((coord: [number, number]) => {
            const [lon, lat] = coord;
            return lon >= bounds.west && lon <= bounds.east && 
                   lat >= bounds.south && lat <= bounds.north;
          });
          
          if (coords.length >= 2) {
            clippedSegments.push(turf.lineString(coords, feature.properties));
          }
        } catch (e) {
          console.error('Failed to process feature:', e);
        }
      }
    }

    // Now try to merge connected segments
    let mergedSegments = [...clippedSegments];
    
    // Simple merging: attempt to join segments that share end points
    let merged = true;
    while (merged) {
      merged = false;
      const newMergedSegments: any[] = [];
      const used = new Set();
      
      for (let i = 0; i < mergedSegments.length; i++) {
        if (used.has(i)) continue;
        
        let currentSegment = mergedSegments[i];
        let mergedWithAnother = false;
        
        for (let j = i + 1; j < mergedSegments.length; j++) {
          if (used.has(j)) continue;
          
          const otherSegment = mergedSegments[j];
          
          // Check if the segments can be joined
          const currentEnd = currentSegment.geometry.coordinates[currentSegment.geometry.coordinates.length - 1];
          const otherStart = otherSegment.geometry.coordinates[0];
          const currentStart = currentSegment.geometry.coordinates[0];
          const otherEnd = otherSegment.geometry.coordinates[otherSegment.geometry.coordinates.length - 1];
          
          // Join if endpoints are very close (within a small threshold)
          const distanceThreshold = 0.0001; // Approximately 11 meters at equator
          if (Math.abs(currentEnd[0] - otherStart[0]) < distanceThreshold && 
              Math.abs(currentEnd[1] - otherStart[1]) < distanceThreshold) {
            // Join: current -> other
            const newCoords = [...currentSegment.geometry.coordinates, ...otherSegment.geometry.coordinates.slice(1)];
            const newSegment = turf.lineString(newCoords, currentSegment.properties);
            currentSegment = newSegment;
            used.add(j);
            mergedWithAnother = true;
            merged = true;
          } else if (Math.abs(currentStart[0] - otherEnd[0]) < distanceThreshold && 
                     Math.abs(currentStart[1] - otherEnd[1]) < distanceThreshold) {
            // Join: other -> current
            const newCoords = [...otherSegment.geometry.coordinates, ...currentSegment.geometry.coordinates.slice(1)];
            const newSegment = turf.lineString(newCoords, currentSegment.properties);
            currentSegment = newSegment;
            used.add(j);
            mergedWithAnother = true;
            merged = true;
          } else if (Math.abs(currentEnd[0] - otherEnd[0]) < distanceThreshold && 
                     Math.abs(currentEnd[1] - otherEnd[1]) < distanceThreshold) {
            // Reverse other and join: current -> reverse(other)
            const reversedOtherCoords = [...otherSegment.geometry.coordinates].reverse();
            const newCoords = [...currentSegment.geometry.coordinates, ...reversedOtherCoords.slice(1)];
            const newSegment = turf.lineString(newCoords, currentSegment.properties);
            currentSegment = newSegment;
            used.add(j);
            mergedWithAnother = true;
            merged = true;
          } else if (Math.abs(currentStart[0] - otherStart[0]) < distanceThreshold && 
                     Math.abs(currentStart[1] - otherStart[1]) < distanceThreshold) {
            // Reverse current and join: reverse(current) -> other
            const reversedCurrentCoords = [...currentSegment.geometry.coordinates].reverse();
            const newCoords = [...reversedCurrentCoords, ...otherSegment.geometry.coordinates.slice(1)];
            const newSegment = turf.lineString(newCoords, currentSegment.properties);
            currentSegment = newSegment;
            used.add(j);
            mergedWithAnother = true;
            merged = true;
          }
        }
        
        newMergedSegments.push(currentSegment);
        used.add(i);
      }
      
      mergedSegments = newMergedSegments;
    }

    // Convert the merged features back to OSM format
    const processedElements = mergedSegments
      .filter(feature => 
        feature?.geometry && 
        feature.geometry.type === 'LineString' && 
        feature.geometry.coordinates.length >= 2
      )
      .map((feature, index) => {
        return {
          type: 'way',
          id: `unified-river-${index}`,
          nodes: feature.geometry.coordinates.map((coord: [number, number], nodeIndex: number) => ({
            id: `unified-node-${index}-${nodeIndex}`,
            lat: coord[1],
            lon: coord[0]
          })),
          tags: { 
            ...feature.properties?.tags,
            'waterway': feature.properties?.type || 'river',
            'name': feature.properties?.tags?.name || `Unified River ${index}`,
            'merged': true
          },
        };
      });

    return { elements: processedElements };
  } catch (error) {
    console.error('Error in processRiverDataAdvanced:', error);
    
    // If advanced processing fails, return original data
    return data;
  }
}