import * as Cesium from "cesium";

// Fungsi untuk menguji koneksi ke Cesium Ion
export async function testCesiumConnection(accessToken: string) {
  try {
    // Set access token
    Cesium.Ion.defaultAccessToken = accessToken;
    
    // Uji koneksi dengan mencoba mengakses informasi akun
    // Menggunakan endpoint yang lebih sederhana untuk testing
    const response = await fetch("https://api.cesium.com/v1/assets/96188", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      console.log("Koneksi ke Cesium berhasil!");
      return true;
    } else {
      console.error("Gagal terhubung ke Cesium:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error("Gagal terhubung ke Cesium:", error);
    return false;
  }
}

// Fungsi untuk menguji apakah asset dengan ID 96188 tersedia
export async function testAssetAvailability(accessToken: string) {
  try {
    // Set access token
    Cesium.Ion.defaultAccessToken = accessToken;
    
    // Coba akses metadata asset menggunakan Cesium API
    // Kita akan menggunakan endpoint dasar untuk memeriksa apakah asset ada
    const resource = await Cesium.IonResource.fromAssetId(96188);
    console.log("Asset ditemukan:", resource);
    return true;
  } catch (error) {
    console.error("Asset tidak tersedia:", error);
    return false;
  }
}