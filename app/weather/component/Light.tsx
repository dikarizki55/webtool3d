"use client";

import { useScene } from "../context/sceneContext";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { SoftShadows } from "@react-three/drei";

export default function Light() {
  const { night } = useScene();
  const [transition, setTransition] = useState(false);

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const prog = useRef(0);
  const intensity = useRef(1);
  const targetIntensity = !night ? 2 : 0.3;

  useEffect(() => {
    setTransition(true);
  }, [night]);

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

      if (t === 1) {
        prog.current = 0;
        setTransition(false);
      }
    }
  });

  return (
    <>
      <SoftShadows size={100} samples={16} focus={0.5} />
      <ambientLight ref={ambientRef} intensity={0.5} />
      <directionalLight
        ref={dirRef}
        position={[2, 5, 2]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.01}
      />
      {/* <Environment preset="forest" /> */}
    </>
  );
}
