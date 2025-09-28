// 3D Visualization Page
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import ThreeDScene to avoid SSR issues
const ThreeDScene = dynamic(() => import("../components/ThreeDScene"), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center">Loading 3D scene components...</div>,
});

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

function Generate3DContent() {
  const searchParams = useSearchParams();
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("3D Page: Starting to parse bounds parameter");
    const boundsParam = searchParams.get("bounds");
    if (boundsParam) {
      try {
        console.log("3D Page: Found bounds parameter, parsing...");
        // Decode URL encoded string
        const decodedBounds = decodeURIComponent(boundsParam);
        console.log("3D Page: Decoded bounds:", decodedBounds);
        const parsedBounds = JSON.parse(decodedBounds);
        console.log("3D Page: Parsed bounds:", parsedBounds);
        setBounds(parsedBounds);
      } catch (error) {
        console.error("3D Page: Error parsing bounds:", error);
      }
    } else {
      console.log("3D Page: No bounds parameter found");
    }
    console.log("3D Page: Finished initial loading");
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading page...</div>;
  }

  if (!bounds) {
    return <div className="h-screen w-full flex items-center justify-center">No area selected. Please go back and select an area.</div>;
  }

  return (
    <div className="h-screen w-full">
      <ThreeDScene bounds={bounds} />
    </div>
  );
}

export default function Generate3DPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading 3D page...</div>}>
      <Generate3DContent />
    </Suspense>
  );
}
