// // app/api/coordinates/route.ts
// import { NextRequest, NextResponse } from "next/server";

// interface Bounds {
//   north: number;
//   south: number;
//   east: number;
//   west: number;
// }

// export async function POST(request: NextRequest) {
//   try {
//     const bounds: Bounds = await request.json();

//     // Validate the bounds data
//     if (
//       typeof bounds.north !== "number" ||
//       typeof bounds.south !== "number" ||
//       typeof bounds.east !== "number" ||
//       typeof bounds.west !== "number"
//     ) {
//       return NextResponse.json(
//         { error: "Invalid coordinates format" },
//         { status: 400 }
//       );
//     }

//     // Validate coordinate ranges
//     if (
//       bounds.north < -90 ||
//       bounds.north > 90 ||
//       bounds.south < -90 ||
//       bounds.south > 90 ||
//       bounds.east < -180 ||
//       bounds.east > 180 ||
//       bounds.west < -180 ||
//       bounds.west > 180
//     ) {
//       return NextResponse.json(
//         { error: "Coordinates out of valid range" },
//         { status: 400 }
//       );
//     }

//     // Calculate area (approximate)
//     const latDiff = Math.abs(bounds.north - bounds.south);
//     const lngDiff = Math.abs(bounds.east - bounds.west);
//     const approximateArea = latDiff * lngDiff;

//     // Here you can process the coordinates as needed
//     console.log("Received coordinates:", bounds);

//     // Example: You could save to database, call external API, etc.
//     // const result = await saveToDatabase(bounds);
//     // const externalResponse = await callExternalAPI(bounds);

//     // Return success response with additional info
//     return NextResponse.json({
//       success: true,
//       message: "Coordinates received successfully",
//       data: {
//         bounds,
//         center: {
//           lat: (bounds.north + bounds.south) / 2,
//           lng: (bounds.east + bounds.west) / 2,
//         },
//         approximateArea: approximateArea.toFixed(6),
//       },
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     console.error("Error processing coordinates:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bounds: Bounds = body.bounds;

    if (!bounds) {
      return NextResponse.json({ error: "Bounds required" }, { status: 400 });
    }

    // 👉 TODO: gunakan bounds untuk cari tile spesifik
    // Untuk contoh: ambil langsung salah satu tile b3dm
    const assetId = "96188"; // isi di .env
    const accessToken = process.env.CESIUM_ACCESS_TOKEN; // isi di .env

    if (!assetId || !accessToken) {
      return NextResponse.json(
        { error: "Missing CESIUM_ASSET_ID or CESIUM_ION_TOKEN" },
        { status: 500 }
      );
    }

    // contoh ambil root tile
    const tileUrl = `https://assets.cesium.com/${assetId}/0/0/0.b3dm?access_token=${accessToken}`;

    const response = await fetch(tileUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch tile: ${response.statusText}` },
        { status: response.status }
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="tile.b3dm"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
