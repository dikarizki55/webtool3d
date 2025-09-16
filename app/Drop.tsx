"use client";

import React, { useState, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/Addons.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJExporterWithMTL } from "@/util/objExporter";

type ColorOption = "white" | "red" | "green" | "blue";

interface ColorState {
  [key: string]: ColorOption; // meshId -> color
}

const COLOR_OPTIONS: { [key in ColorOption]: string } = {
  white: "#ffffff",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
};

interface ModelViewerProps {
  modelUrl?: string;
  fileType?: "stl" | "obj";
  onMeshClick?: (meshId: string) => void;
  meshColors?: ColorState;
  selectedMesh?: string | null;
}

const handleExportOBJWithMTL = (object: THREE.Object3D) => {
  const exporter = new OBJExporterWithMTL();
  const { obj, mtl } = exporter.parse(object);

  // download OBJ
  const objBlob = new Blob([obj], { type: "text/plain" });
  const objUrl = URL.createObjectURL(objBlob);
  const linkObj = document.createElement("a");
  linkObj.href = objUrl;
  linkObj.download = "model.obj";
  linkObj.click();
  URL.revokeObjectURL(objUrl);

  // download MTL
  const mtlBlob = new Blob([mtl], { type: "text/plain" });
  const mtlUrl = URL.createObjectURL(mtlBlob);
  const linkMtl = document.createElement("a");
  linkMtl.href = mtlUrl;
  linkMtl.download = "model.mtl";
  linkMtl.click();
  URL.revokeObjectURL(mtlUrl);
};

const handleExportSTL = (object: THREE.Object3D) => {
  const exporter = new STLExporter();
  const result = exporter.parse(object); // ArrayBuffer
  const blob = new Blob([result], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "model.stl";
  link.click();

  URL.revokeObjectURL(url);
};

const ModelViewer = React.forwardRef<THREE.Object3D | null, ModelViewerProps>(
  ({ modelUrl, fileType, onMeshClick, meshColors, selectedMesh }, ref) => {
    const groupRef = useRef<THREE.Group>(null);

    React.useImperativeHandle(ref, () => groupRef.current ?? new THREE.Group());

    const [modelData, setModelData] = useState<{
      geometry?: THREE.BufferGeometry;
      group?: THREE.Group;
    } | null>(null);

    React.useEffect(() => {
      if (!modelUrl || !fileType) return;

      const loadModel = async () => {
        try {
          if (fileType === "stl") {
            const stlLoader = new STLLoader();
            const geometry = await new Promise<THREE.BufferGeometry>(
              (resolve, reject) => {
                stlLoader.load(
                  modelUrl,
                  (geometry: THREE.BufferGeometry) => resolve(geometry),
                  undefined,
                  (error: any) => reject(error)
                );
              }
            );
            setModelData({ geometry });
          } else if (fileType === "obj") {
            const objLoader = new OBJLoader();
            const object = await new Promise<THREE.Group>((resolve, reject) => {
              objLoader.load(
                modelUrl,
                (object: THREE.Group) => resolve(object),
                undefined,
                (error: any) => reject(error)
              );
            });
            setModelData({ group: object });
          }
        } catch (error) {
          console.error("Error loading model:", error);
        }
      };

      loadModel();
    }, [modelUrl, fileType]);

    if (!modelData) return null;

    // Calculate bounding box and scale for the entire model
    let bbox: THREE.Box3;
    let center: THREE.Vector3;
    let scale: number;

    if (modelData.geometry) {
      // STL case - single geometry
      modelData.geometry.computeBoundingBox();
      bbox = modelData.geometry.boundingBox!;
    } else if (modelData.group) {
      // OBJ case - group of meshes
      bbox = new THREE.Box3().setFromObject(modelData.group);
    } else {
      return null;
    }

    center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    scale = 2 / maxDim;

    if (modelData.geometry) {
      // Render STL as single mesh
      const meshId = "stl-0";
      const color = meshColors?.[meshId] || "white";

      const isSelected = selectedMesh === meshId;

      return (
        <mesh
          ref={groupRef}
          scale={[scale, scale, scale]}
          position={[-center.x * scale, -center.y * scale, -center.z * scale]}
          onClick={(e) => {
            e.stopPropagation();
            onMeshClick?.(meshId);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "auto";
          }}
        >
          <primitive object={modelData.geometry} />
          <meshStandardMaterial
            color={COLOR_OPTIONS[color]}
            roughness={0.3}
            metalness={0.1}
          />
          {isSelected && (
            <mesh geometry={modelData.geometry} scale={1.01}>
              <meshBasicMaterial
                color="yellow"
                transparent
                opacity={0.3}
                depthTest={false}
              />
            </mesh>
          )}
        </mesh>
      );
    } else if (modelData.group) {
      // Render OBJ as group with separate meshes
      return (
        <group
          ref={groupRef}
          scale={[scale, scale, scale]}
          position={[-center.x * scale, -center.y * scale, -center.z * scale]}
        >
          {modelData.group.children.map((child, index) => {
            if (child instanceof THREE.Mesh) {
              const meshId = `obj-${index}`;
              const color = meshColors?.[meshId] || "white";

              const isSelected = selectedMesh === meshId;

              return (
                <mesh
                  key={index}
                  geometry={child.geometry}
                  position={[
                    child.position.x,
                    child.position.y,
                    child.position.z,
                  ]}
                  rotation={[
                    child.rotation.x,
                    child.rotation.y,
                    child.rotation.z,
                  ]}
                  scale={[child.scale.x, child.scale.y, child.scale.z]}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMeshClick?.(meshId);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = "pointer";
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = "auto";
                  }}
                >
                  <meshStandardMaterial
                    color={COLOR_OPTIONS[color]}
                    roughness={0.3}
                    metalness={0.1}
                  />
                  {isSelected && (
                    <mesh geometry={child.geometry} scale={1.01}>
                      <meshBasicMaterial
                        color="yellow"
                        transparent
                        opacity={0.3}
                        depthTest={false}
                      />
                    </mesh>
                  )}
                </mesh>
              );
            }
            return null;
          })}
        </group>
      );
    }

    return null;
  }
);

function Scene({
  modelUrl,
  fileType,
  onMeshClick,
  meshColors,
  selectedMesh,
  onDeselect,
  modelRef,
}: ModelViewerProps & {
  onDeselect: () => void;
  modelRef: React.RefObject<THREE.Object3D | null>;
}) {
  return (
    <Canvas
      onPointerMissed={(e) => {
        // Klik di luar mesh
        if (e.button === 0) {
          // biar cuma klik kiri
          onDeselect();
        }
      }}
      camera={{ position: [3, 3, 3], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      <Suspense fallback={null}>
        <ModelViewer
          modelUrl={modelUrl}
          fileType={fileType}
          onMeshClick={onMeshClick}
          meshColors={meshColors}
          selectedMesh={selectedMesh}
          ref={modelRef}
        />
        <Environment preset="studio" />
      </Suspense>

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <gridHelper args={[10, 10]} />
    </Canvas>
  );
}

export default function ModelDragDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const [modelUrl, setModelUrl] = useState<string>();
  const [fileType, setFileType] = useState<"stl" | "obj">();
  const [fileName, setFileName] = useState<string>();
  const [mtlUrl, setMtlUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [meshColors, setMeshColors] = useState<ColorState>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelRef = useRef<THREE.Object3D | null>(null);

  const handleMeshClick = (meshId: string) => {
    setSelectedMesh(meshId);
  };

  const handleColorChange = (color: ColorOption) => {
    if (selectedMesh) {
      setMeshColors((prev) => ({
        ...prev,
        [selectedMesh]: color,
      }));
      setSelectedMesh("");
    }
  };

  const resetColors = () => {
    setMeshColors({});
    setSelectedMesh(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    setError(undefined);

    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["stl", "obj"].includes(extension)) {
      setError("File harus berformat STL atau OBJ");
      return;
    }

    // Revoke previous URL to prevent memory leaks
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }

    const url = URL.createObjectURL(file);
    setModelUrl(url);
    setFileType(extension as "stl" | "obj");
    setFileName(file.name);
    setSelectedMesh(null);
    setMeshColors({});
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleClear = () => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    setModelUrl(undefined);
    setFileType(undefined);
    setFileName(undefined);
    setError(undefined);
    setSelectedMesh(null);
    setMeshColors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  React.useEffect(() => {
    // Cleanup URL on unmount
    return () => {
      if (modelUrl) {
        URL.revokeObjectURL(modelUrl);
      }
    };
  }, [modelUrl]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            3D Model Viewer
          </h1>
          <p className="text-gray-600">
            Drag & drop file STL atau OBJ untuk melihat model 3D
          </p>
        </div>

        {!modelUrl ? (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4 flex items-center justify-center">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drag & drop file model 3D
            </h3>
            <p className="text-gray-500 mb-4">
              atau klik tombol di bawah untuk memilih file
            </p>
            <button
              onClick={handleBrowseFiles}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Pilih File
            </button>
            <p className="text-sm text-gray-400 mt-4">
              Mendukung format: STL, OBJ
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.obj,.mtl"
              onChange={handleFileInput}
              className="hidden"
            />

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 text-blue-600 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{fileName}</p>
                  <p className="text-sm text-gray-500">
                    Format: {fileType?.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Color Control Panel */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-3">Color Control</h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  {selectedMesh ? (
                    <span className="text-green-600">
                      ✓ Mesh selected: {selectedMesh}
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      Click on a mesh to select it
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {(["white", "red", "green", "blue"] as ColorOption[]).map(
                    (color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        disabled={!selectedMesh}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          selectedMesh && meshColors[selectedMesh] === color
                            ? "border-gray-900 scale-110"
                            : selectedMesh
                            ? "border-gray-300 hover:border-gray-400"
                            : "border-gray-200 opacity-50 cursor-not-allowed"
                        }`}
                        style={{ backgroundColor: COLOR_OPTIONS[color] }}
                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                      />
                    )
                  )}
                </div>

                <button
                  onClick={resetColors}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
                >
                  Reset All Colors
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-96 md:h-[600px]">
                <Scene
                  modelUrl={modelUrl}
                  fileType={fileType}
                  onMeshClick={handleMeshClick}
                  meshColors={meshColors}
                  selectedMesh={selectedMesh}
                  onDeselect={() => setSelectedMesh(null)} // ✅ reset selection
                  modelRef={modelRef}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                Kontrol Viewer:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Klik kiri + drag untuk merotasi model</li>
                <li>• Scroll mouse untuk zoom in/out</li>
                <li>• Klik kanan + drag untuk pan (geser pandangan)</li>
                <li>• Klik pada mesh untuk memilihnya, lalu pilih warna</li>
              </ul>
            </div>
            <button
              className=" text-black hover:text-blue-500 cursor-pointer"
              onClick={() =>
                modelRef.current && handleExportOBJWithMTL(modelRef.current)
              }
            >
              Export OBJ (with colors)
            </button>

            <button
              className=" text-black hover:text-blue-500 cursor-pointer"
              onClick={() =>
                modelRef.current && handleExportSTL(modelRef.current)
              }
            >
              Export STL (geometry only)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
