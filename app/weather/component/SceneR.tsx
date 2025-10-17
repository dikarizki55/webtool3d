"use client";
import React, { useEffect, useRef, useState } from "react";
import Model from "./Model";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitType } from "three-stdlib";
import { useSpring } from "@react-spring/three";

export default function SceneR() {
  return (
    <Canvas camera={{ fov: 39.6 }}>
      <ambientLight intensity={1} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      <Model />
      <Environment preset="sunset" />
      <AutoOrbitCamera />
    </Canvas>
  );
}

function AutoOrbitCamera() {
  const delay = 2000;
  const speed = 0.005;
  const radius = 11;
  const orbitRef = useRef<OrbitType | null>(null);
  const isInteractingRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef<number>(0);
  const transitionRef = useRef<boolean>(false);

  const [{ position, lookAt }, api] = useSpring(() => ({
    position: [0, 0, 0], //just initial
    lookAt: [0, 0, 0],
    config: { tension: 100, friction: 30, mass: 1 },
    onRest: () => {
      transitionRef.current = false;
      isInteractingRef.current = false;
    },
  }));

  useEffect(() => {
    if (!orbitRef.current) return;
    const control = orbitRef.current;

    const handleStart = () => {
      isInteractingRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      control.update();
    };

    const handleEnd = () => {
      timeoutRef.current = setTimeout(() => {
        // isInteractingRef.current = false;
        transitionRef.current = true;
        const camPos = control.object.position;
        const lastLook = control.target;
        const lastPosX = radius * Math.sin(rotationRef.current);
        const lastPosZ = radius * Math.cos(rotationRef.current);

        const distance =
          Math.abs(camPos.x - lastPosX) +
          Math.abs(camPos.y - 0) +
          Math.abs(camPos.z - lastPosZ);

        if (distance < 0.001) {
          transitionRef.current = false;
          isInteractingRef.current = false;
          return;
        }

        api.start({
          from: {
            position: [camPos.x, camPos.y, camPos.z],
            lookAt: [lastLook.x, lastLook.y, lastLook.z],
          },
          to: {
            position: [lastPosX, 0, lastPosZ],
            lookAt: [0, 0, 0],
          },
        });
      }, delay);
    };

    control.addEventListener("start", handleStart);
    control.addEventListener("end", handleEnd);
    return () => {
      control.removeEventListener("start", handleStart);
      control.removeEventListener("end", handleEnd);
    };
  }, []);

  useFrame(() => {
    if (!orbitRef.current) return;
    if (!isInteractingRef.current) {
      rotationRef.current += speed;
      const orbit = orbitRef.current;
      const x = radius * Math.sin(rotationRef.current);
      const z = radius * Math.cos(rotationRef.current);
      orbit.object.position.set(x, 0, z);
      orbit.target.set(0, 0, 0);
      orbit.update();
    }
    if (transitionRef.current) {
      const [x, y, z] = position.get();
      const orbit = orbitRef.current;
      orbit.object.position.set(x, y, z);
      const [lookx, looky, lookz] = lookAt.get();
      orbit.target.set(lookx, looky, lookz);
      orbit.update();
    }
  });

  return <OrbitControls ref={orbitRef} />;
}
