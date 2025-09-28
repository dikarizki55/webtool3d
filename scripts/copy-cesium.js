const path = require("path");
const fs = require("fs");

const cesiumSource = path.join(
  __dirname,
  "../node_modules/cesium/Build/Cesium"
);
const cesiumDest = path.join(__dirname, "../public/cesium");

// rekursif copy folder
fs.cpSync(cesiumSource, cesiumDest, { recursive: true, force: true });

console.log("✅ Cesium assets copied to public/cesium");
