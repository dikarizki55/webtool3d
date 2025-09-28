import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { bbox } = body; // [[lat1, lon1], [lat2, lon2]]

  console.log("Received bbox:", bbox);

  // TODO: proses fetch Cesium/3DTiles di sini
  return NextResponse.json({ ok: true, bbox });
}
