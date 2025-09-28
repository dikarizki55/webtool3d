type OsmNode = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
};

type OsmWay = {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};

type OsmElement = OsmNode | OsmWay;

export function osmToGeoJSON(osmData: { elements: OsmElement[] }) {
  // Buat dictionary node id → koordinat
  const nodesMap: Record<number, [number, number]> = {};
  osmData.elements
    .filter((el) => el.type === "node")
    .forEach((n: OsmNode) => {
      nodesMap[n.id] = [n.lon, n.lat]; // GeoJSON pakai [lon,lat]
    });

  // Convert setiap way jadi GeoJSON Feature
  const features = osmData.elements
    .filter((el) => el.type === "way")
    .map((way: OsmWay) => {
      const coords = way.nodes.map((id) => nodesMap[id]).filter(Boolean);

      // Check if it should be treated as a polygon based on tags
      const isWaterArea = way.tags?.natural === "water" || 
                          way.tags?.waterway === "riverbank" || 
                          way.tags?.waterway === "basin";
      
      // For water areas, ensure polygon is closed
      if (isWaterArea && coords.length > 0) {
        if (
          coords[0][0] !== coords[coords.length - 1][0] ||
          coords[0][1] !== coords[coords.length - 1][1]
        ) {
          coords.push(coords[0]);
        }
      }

      // Determine geometry type based on whether it's closed or tagged as water area
      const isClosed = coords.length > 2 && 
        coords[0][0] === coords[coords.length - 1][0] && 
        coords[0][1] === coords[coords.length - 1][1];
      
      const geometryType = isWaterArea || isClosed ? "Polygon" : "LineString";

      return {
        type: "Feature",
        geometry: {
          type: geometryType,
          coordinates: geometryType === "Polygon" ? [coords] : coords,
        },
        properties: {
          id: way.id,
          ...(way.tags || {}),
        },
      };
    });

  return {
    type: "FeatureCollection",
    features,
  };
}
