"use client";
import { useGLTF } from "@react-three/drei";
import { JSX } from "react";

type ModelProps = JSX.IntrinsicElements["group"];

export default function Model(props: ModelProps) {
  const { scene } = useGLTF("/weather/sun.glb");
  return <primitive object={scene} {...props} />;
}
