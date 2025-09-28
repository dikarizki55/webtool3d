// utils/createClippingBox.ts
import * as THREE from "three";

export function createClippingBox(
  bounds: { north: number; south: number; east: number; west: number },
  scale = 10000,
  height = 500 // tinggi box supaya nutup semua
) {
  const centerX = ((bounds.east + bounds.west) / 2 - bounds.west) * scale;
  const centerY = ((bounds.north + bounds.south) / 2 - bounds.south) * scale;
  const sizeX = (bounds.east - bounds.west) * scale;
  const sizeY = (bounds.north - bounds.south) * scale;

  const boxGeom = new THREE.BoxGeometry(sizeX, sizeY, height);
  const boxMesh = new THREE.Mesh(boxGeom);
  boxMesh.position.set(centerX, centerY, height / 2);
  return boxMesh;
}
