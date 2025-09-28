import { NextRequest } from "next/server";
import { processRiverDataUnion } from "@/utils/riverProcessor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const north = parseFloat(searchParams.get("north") || "");
  const south = parseFloat(searchParams.get("south") || "");
  const east = parseFloat(searchParams.get("east") || "");
  const west = parseFloat(searchParams.get("west") || "");

  // console.log("OSM Rivers API: Received bounds:", { north, south, east, west });

  // Validate bounds
  if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
    // console.log("OSM Rivers API: Invalid bounds parameters");
    return new Response(
      JSON.stringify({ error: "Invalid bounds parameters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate bounds order
  if (north <= south || east <= west) {
    // console.log("OSM Rivers API: Invalid bounds order");
    return new Response(JSON.stringify({ error: "Invalid bounds order" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate bounds range (prevent too large areas - max 1km x 1km)
  // Calculate approximate distance in km using haversine formula
  // For simplicity, we'll use average conversion: 1 degree ≈ 111 km
  // More precise would be: 1 degree latitude = 111 km, 1 degree longitude = 111 * cos(latitude) km
  const centerLat = (north + south) / 2;
  const latDiff = Math.abs(north - south);
  const lonDiff = Math.abs(east - west);

  // Convert differences to approximate km
  // 1 degree of latitude is ~111 km everywhere
  // 1 degree of longitude is ~111 * cos(latitude) km (shrinks towards poles)
  const latKm = latDiff * 111;
  const lonKm = lonDiff * (111 * Math.cos((centerLat * Math.PI) / 180));

  // Max 1km in each direction
  const maxKm = 100.0;

  if (latKm > maxKm || lonKm > maxKm) {
    // console.log("OSM Rivers API: Bounds area too large:", {
    //   latKm,
    //   lonKm,
    //   maxKm,
    //   latDiff,
    //   lonDiff,
    //   centerLat,
    // });
    return new Response(
      JSON.stringify({
        error:
          "Selected area too large. Please select an area smaller than 1km x 1km.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Calculate a buffer around the requested bounds to ensure rivers aren't truncated
  // Convert approximate meters to degrees (1 degree ~ 111km at equator)
  const bufferInDegrees = 0.01; // ~1110 meters buffer (increased from 555m)

  // Calculate buffer based on the center latitude to account for longitude scaling
  const boundsCenterLat = (north + south) / 2;
  const metersPerDegreeLng =
    111320 * Math.cos((boundsCenterLat * Math.PI) / 180);
  const bufferInLngDegrees = (111320 * bufferInDegrees) / metersPerDegreeLng;

  const bufferedSouth = south - bufferInDegrees;
  const bufferedNorth = north + bufferInDegrees;
  const bufferedWest = west - bufferInLngDegrees;
  const bufferedEast = east + bufferInLngDegrees;

  // Overpass API query for rivers and water bodies in the buffered bounds
  const query = `
    [out:json][timeout:25];
    (
      // Fetch all types of waterways (linear features)
      way["waterway"~"river|stream|canal|drain|ditch|riverbank|dam|weir|brook"](${bufferedSouth},${bufferedWest},${bufferedNorth},${bufferedEast});
      // Fetch water bodies (area features)
      way["natural"="water"](${bufferedSouth},${bufferedWest},${bufferedNorth},${bufferedEast});
      way["waterway"="dock"](${bufferedSouth},${bufferedWest},${bufferedNorth},${bufferedEast});
      way["waterway"="basin"](${bufferedSouth},${bufferedWest},${bufferedNorth},${bufferedEast});
    );
    out body;
    >;
    out skel qt;
  `;

  // console.log("OSM Rivers API: Sending query to Overpass API:", query);

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: query,
    });

    // console.log(
    //   "OSM Rivers API: Received response from Overpass API with status:",
    //   response.status
    // );

    if (!response.ok) {
      console.error(
        "OSM Rivers API: Overpass API returned error status:",
        response.status
      );
      const errorText = await response.text();
      console.error(
        "OSM Rivers API: Error response from Overpass API:",
        errorText
      );
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}`
      );
    }

    let data = await response.json();

    // console.log("DATANYA River", data);

    // Return raw data without filtering - nodes are needed for geometry construction
    console.log(
      "OSM Rivers API: Returning",
      data.elements?.length || 0,
      "elements"
    );

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("OSM Rivers API: Error fetching OSM data:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: "Failed to fetch OSM data: " + message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
