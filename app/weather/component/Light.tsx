"use client";

import { Environment } from "@react-three/drei";
import { useScene } from "../context/sceneContext";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

export default function Light() {
  const { day } = useScene();
  const { scene } = useThree();
  const [transition, setTransition] = useState(false);

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const prog = useRef(0);
  const intensity = useRef(1);
  const targetIntensity = day ? 1 : 0.5;

  useEffect(() => {
    setTransition(true);
  }, [day]);

  useFrame((_, delta) => {
    if (transition) {
      prog.current += delta / 1;
      const t = Math.min(prog.current, 1);
      intensity.current = THREE.MathUtils.lerp(
        intensity.current,
        targetIntensity,
        t
      );

      if (ambientRef.current && dirRef.current) {
        ambientRef.current.intensity = intensity.current;
        dirRef.current.intensity = intensity.current;
      }

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              if ("envMapIntensity" in mat)
                mat.envMapIntensity = intensity.current;
            });
          } else {
            const mat = mesh.material as THREE.Material & {
              envMapIntensity?: number;
            };
            if (mat.envMapIntensity !== undefined) {
              mat.envMapIntensity = intensity.current;
            }
          }
        }
      });

      if (t === 1) {
        prog.current = 0;
        setTransition(false);
      }
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={1} />
      <directionalLight ref={dirRef} position={[2, 2, 2]} intensity={1} />
      <Environment preset="forest" />
    </>
  );
}
