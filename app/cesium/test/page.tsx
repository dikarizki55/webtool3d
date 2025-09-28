"use client";

import { useEffect, useState } from "react";
import { testCesiumConnection, testAssetAvailability } from "@/util/cesium-test";

export default function CesiumTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>("Testing...");
  const [assetStatus, setAssetStatus] = useState<string>("Testing...");
  const [tokenStatus, setTokenStatus] = useState<string>("Checking...");

  useEffect(() => {
    const runTests = async () => {
      const token = process.env.NEXT_PUBLIC_CESIUM_ACCESS_TOKEN || "";
      
      // Periksa apakah token ada
      if (!token) {
        setTokenStatus("Access token tidak ditemukan!");
        setConnectionStatus("Tidak dapat diuji");
        setAssetStatus("Tidak dapat diuji");
        return;
      } else {
        setTokenStatus("Ditemukan");
      }

      // Test koneksi
      const connectionResult = await testCesiumConnection(token);
      setConnectionStatus(connectionResult ? "Berhasil" : "Gagal");

      // Test asset availability
      const assetResult = await testAssetAvailability(token);
      setAssetStatus(assetResult ? "Tersedia" : "Tidak tersedia");
    };

    runTests();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cesium Connection Test</h1>
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Access Token Status:</h2>
          <p>{tokenStatus}</p>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Connection Status:</h2>
          <p>{connectionStatus}</p>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Asset 96188 Status:</h2>
          <p>{assetStatus}</p>
        </div>
        <div className="p-4 border rounded bg-yellow-50">
          <h2 className="font-semibold">Troubleshooting:</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Pastikan access token di .env sudah benar</li>
            <li>Periksa apakah asset ID 96188 adalah 3D Tileset</li>
            <li>Cek apakah asset tersebut sudah dipublikasikan di Cesium Ion</li>
            <li>Pastikan akun Cesium Ion Anda memiliki akses ke asset tersebut</li>
          </ul>
        </div>
      </div>
    </div>
  );
}