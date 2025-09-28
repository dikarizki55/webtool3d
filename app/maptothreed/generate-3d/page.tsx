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
    const boundsParam = searchParams.get("bounds");
    if (boundsParam) {
      try {
        // Decode URL encoded string
        const decodedBounds = decodeURIComponent(boundsParam);
        const parsedBounds = JSON.parse(decodedBounds);
        setBounds(parsedBounds);
      } catch (error) {
        console.error("3D Page: Error parsing bounds:", error);
      }
    }
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
