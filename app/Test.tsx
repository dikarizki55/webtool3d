import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

// Komponen untuk objek 3D yang dapat dipilih face-nya
function SelectableBox() {
  const meshRef = useRef();
  const [selectedFace, setSelectedFace] = useState(null);
  const [hoveredFace, setHoveredFace] = useState(null);
  const { raycaster, camera, pointer, scene } = useThree();

  // Data untuk setiap face
  const faceData = [
    { name: "Front", color: "#ff6b6b" },
    { name: "Back", color: "#4ecdc4" },
    { name: "Right", color: "#45b7d1" },
    { name: "Left", color: "#f9ca24" },
    { name: "Top", color: "#6c5ce7" },
    { name: "Bottom", color: "#fd79a8" },
  ];

  // Handle click untuk select face
  const handleClick = (event) => {
    event.stopPropagation();

    if (!meshRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(meshRef.current);

    if (intersects.length > 0) {
      const faceIndex = Math.floor(intersects[0].faceIndex / 2);
      setSelectedFace(faceIndex);
    }
  };

  // Handle hover untuk preview
  const handlePointerMove = (event) => {
    event.stopPropagation();

    if (!meshRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(meshRef.current);

    if (intersects.length > 0) {
      const faceIndex = Math.floor(intersects[0].faceIndex / 2);
      setHoveredFace(faceIndex);
    } else {
      setHoveredFace(null);
    }
  };

  // Update material berdasarkan face yang dipilih/hover
  useEffect(() => {
    if (!meshRef.current) return;

    const geometry = meshRef.current.geometry;
    const positionAttribute = geometry.attributes.position;
    const colorAttribute = new THREE.BufferAttribute(
      new Float32Array(positionAttribute.count * 3),
      3
    );

    // Set warna untuk setiap vertex
    for (let i = 0; i < positionAttribute.count; i++) {
      const faceIndex = Math.floor(i / 4);
      let color = new THREE.Color("#ffffff");

      if (selectedFace === faceIndex) {
        color = new THREE.Color(faceData[faceIndex]?.color || "#ffffff");
      } else if (hoveredFace === faceIndex) {
        color = new THREE.Color(
          faceData[faceIndex]?.color || "#ffffff"
        ).multiplyScalar(0.7);
      } else {
        color = new THREE.Color("#e0e0e0");
      }

      colorAttribute.setXYZ(i, color.r, color.g, color.b);
    }

    geometry.setAttribute("color", colorAttribute);
    meshRef.current.material.needsUpdate = true;
  }, [selectedFace, hoveredFace]);

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredFace(null)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshLambertMaterial vertexColors />
      </mesh>

      {/* Text untuk menampilkan face yang dipilih */}
      {selectedFace !== null && (
        <Text
          position={[0, 3, 0]}
          fontSize={0.5}
          color="#333"
          anchorX="center"
          anchorY="middle"
        >
          Selected: {faceData[selectedFace]?.name || "Unknown"}
        </Text>
      )}

      {/* Text untuk menampilkan face yang di-hover */}
      {hoveredFace !== null && selectedFace !== hoveredFace && (
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.3}
          color="#666"
          anchorX="center"
          anchorY="middle"
        >
          Hover: {faceData[hoveredFace]?.name || "Unknown"}
        </Text>
      )}
    </group>
  );
}

// Komponen untuk objek sphere yang juga dapat dipilih
function SelectableSphere() {
  const meshRef = useRef();
  const [selectedFace, setSelectedFace] = useState(null);
  const [hoveredFace, setHoveredFace] = useState(null);
  const { raycaster, camera, pointer } = useThree();

  const handleClick = (event) => {
    event.stopPropagation();

    if (!meshRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(meshRef.current);

    if (intersects.length > 0) {
      const faceIndex = intersects[0].faceIndex;
      setSelectedFace(faceIndex);
    }
  };

  const handlePointerMove = (event) => {
    event.stopPropagation();

    if (!meshRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(meshRef.current);

    if (intersects.length > 0) {
      const faceIndex = intersects[0].faceIndex;
      setHoveredFace(faceIndex);
    } else {
      setHoveredFace(null);
    }
  };

  return (
    <group position={[4, 0, 0]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredFace(null)}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshLambertMaterial
          color={
            selectedFace !== null
              ? "#ff6b6b"
              : hoveredFace !== null
              ? "#4ecdc4"
              : "#e0e0e0"
          }
          wireframe={hoveredFace !== null || selectedFace !== null}
        />
      </mesh>

      {selectedFace !== null && (
        <Text
          position={[0, 2, 0]}
          fontSize={0.3}
          color="#333"
          anchorX="center"
          anchorY="middle"
        >
          Face: {selectedFace}
        </Text>
      )}
    </group>
  );
}

// Scene component
function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />

      <SelectableBox />
      <SelectableSphere />

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
}

// Info panel
function InfoPanel() {
  return (
    <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg max-w-sm">
      <h2 className="text-lg font-bold mb-2">3D Face Selector</h2>
      <div className="text-sm space-y-1">
        <p>• Klik pada face object untuk memilih</p>
        <p>• Hover untuk preview face</p>
        <p>• Drag untuk rotate camera</p>
        <p>• Scroll untuk zoom</p>
        <p>• Box kiri: Face selection dengan warna</p>
        <p>• Sphere kanan: Face selection dengan wireframe</p>
      </div>

      <div className="mt-3">
        <h3 className="font-semibold">Face Colors:</h3>
        <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded mr-1"></div>
            Front
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-teal-400 rounded mr-1"></div>
            Back
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-400 rounded mr-1"></div>
            Right
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-400 rounded mr-1"></div>
            Left
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-400 rounded mr-1"></div>
            Top
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-pink-400 rounded mr-1"></div>
            Bottom
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Test() {
  return (
    <div className="w-full h-screen bg-gradient-to-b from-blue-100 to-blue-200 relative">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 60 }}
        style={{ background: "linear-gradient(to bottom, #87CEEB, #E0F6FF)" }}
      >
        <Scene />
      </Canvas>

      <InfoPanel />

      {/* Credits */}
      <div className="absolute bottom-4 right-4 text-sm text-gray-600 bg-white bg-opacity-75 px-3 py-1 rounded">
        Built with React Three Fiber & Next.js
      </div>
    </div>
  );
}
