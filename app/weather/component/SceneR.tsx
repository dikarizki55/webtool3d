"use client";
import React, { useEffect, useRef, useState } from "react";
import Model from "./Model";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitType } from "three-stdlib";
import * as THREE from "three";
import { cubicBezier } from "../helper/cubicBezier";

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
  const transProgRef = useRef<number>(0);
  const lastOrbitPosRef = useRef<number[]>([0, 0, 0]);

  //   const [{ position, lookAt }, api] = useSpring(() => ({
  //     position: [0, 0, 0], //just initial
  //     lookAt: [0, 0, 0],
  //     config: { tension: 100, friction: 30, mass: 1 },
  //     onRest: () => {
  //       transitionRef.current = false;
  //       isInteractingRef.current = false;
  //     },
  //   }));

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
        transitionRef.current = true;
        const camPos = control.object.position;
        const lastPosX = radius * Math.sin(rotationRef.current);
        const lastPosZ = radius * Math.cos(rotationRef.current);

        lastOrbitPosRef.current = [camPos.x, camPos.y, camPos.z];

        const distance =
          Math.abs(camPos.x - lastPosX) +
          Math.abs(camPos.y - 0) +
          Math.abs(camPos.z - lastPosZ);

        if (distance < 0.001) {
          transitionRef.current = false;
          isInteractingRef.current = false;
          return;
        }
      }, delay);
    };

    control.addEventListener("start", handleStart);
    control.addEventListener("end", handleEnd);
    control.domElement?.addEventListener("touchmove", handleStart);

    return () => {
      control.removeEventListener("start", handleStart);
      control.removeEventListener("end", handleEnd);
      control.domElement?.removeEventListener("touchmove", handleStart);
    };
  }, []);

  useFrame((_, delta) => {
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
      const orbit = orbitRef.current;

      const duration = 2.5;
      transProgRef.current += delta / duration;
      const t = Math.min(transProgRef.current, 1);
      const ease = cubicBezier(0.3, 0, -0.1, 1)(t);

      const [startX, startY, startZ] = lastOrbitPosRef.current;
      const start = new THREE.Vector3(startX, startY, startZ);
      const endx = radius * Math.sin(rotationRef.current);
      const endz = radius * Math.cos(rotationRef.current);
      const end = new THREE.Vector3(endx, 0, endz);
      orbit.object.position.lerpVectors(start, end, ease);

      orbit.update();

      if (t === 1) {
        transitionRef.current = false;
        isInteractingRef.current = false;
        transProgRef.current = 0;
      }
    }
  });

  return <OrbitControls ref={orbitRef} />;
}
