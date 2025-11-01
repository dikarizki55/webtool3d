import React, { useEffect, useRef, useState } from "react";
import Model from "./Model";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OrbitControls as OrbitType } from "three-stdlib";
import * as THREE from "three";
import { cubicBezier } from "../helper/cubicBezier";
import { useScene } from "../context/sceneContext";
import Light from "./Light";

// Component to enable shadows on the renderer
function ShadowSetup() {
  const { gl } = useThree();
  
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap; // or THREE.PCFShadowMap for harder shadows
  }, [gl]);

  return null;
}

export default function SceneR() {
  const { day } = useScene();

  return (
    <div
      className={`w-full h-full ${
        day ? "bg-[rgb(156,195,255)]" : "bg-[rgb(5,19,40)]"
      } transition-all delay-300 duration-1000`}
    >
      <Canvas camera={{ fov: 50 }} shadows>
        <ShadowSetup />
        <Light />
        <Model />
        <AutoOrbitCamera />
      </Canvas>
    </div>
  );
}

function AutoOrbitCamera() {
  const delay = 2000;
  const speed = 0.005;
  const radius = 8;
  const yCamera = -1;
  const targetCamera = [0, -0.5, 0];

  const orbitRef = useRef<OrbitType | null>(null);
  const isInteractingRef = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef<number>(0);
  const transitionRef = useRef<boolean>(false);
  const transProgRef = useRef<number>(0);
  const lastOrbitPosRef = useRef<number[]>([0, 0, 0]);
  const lastOrbitTargetRef = useRef<number[]>([0, 0, 0]);

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
        const targetPos = control.target;

        lastOrbitPosRef.current = [camPos.x, camPos.y, camPos.z];
        lastOrbitTargetRef.current = [targetPos.x, targetPos.y, targetPos.z];

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
      orbit.object.position.set(x, yCamera, z);
      orbit.target.set(targetCamera[0], targetCamera[1], targetCamera[2]);
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
      const end = new THREE.Vector3(endx, yCamera, endz);
      orbit.object.position.lerpVectors(start, end, ease);

      const [lTX, lTY, lTZ] = lastOrbitTargetRef.current;
      orbit.target.lerpVectors(
        new THREE.Vector3(lTX, lTY, lTZ),
        new THREE.Vector3(targetCamera[0], targetCamera[1], targetCamera[2]),
        ease
      );

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