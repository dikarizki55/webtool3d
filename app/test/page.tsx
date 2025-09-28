"use client";

import { a, easings, useSpring } from "@react-spring/three";
import { OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/Addons.js";

const boxSizes = [
  [1, 1, 1],
  [1, 1, 2],
  [1, 1, 3],
  [1, 1, 4],
];

export default function Test() {
  const [active, setActive] = useState("");
  const [color, setColor] = useState<string[]>(boxSizes.map(() => "skyblue"));

  // Animasi scale Y (tinggi)
  const { scaleY } = useSpring({
    scaleY: active ? 2 : 1, // kalau aktif → tinggi 2x
    config: { tension: 200, friction: 15 }, // biar smooth
  });

  //   const [showText, setShowText] = useState(false);
  //   const [color, setColor] = useState("blue");

  return (
    <div className=" flex justify-center items-center w-full h-screen">
      {active && (
        <div className="flex flex-col items-center gap-5 mr-5">
          {["red", "green", "blue"].map((item) => (
            <div
              key={item}
              onClick={() =>
                setColor((prev) =>
                  prev.map((c, idx) => (idx === Number(active) ? item : c))
                )
              }
              className={` w-10 h-10 rounded-full bg-${item}-500`}
            ></div>
          ))}
        </div>
      )}
      <div className=" w-200 h-150 bg-neutral-500">
        <Canvas
          camera={{ position: [3, 3, 3], fov: 50 }}
          onPointerMissed={(e) => {
            if (e.button === 0) {
              setActive("");
            }
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 10, 0]} intensity={1} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          {boxSizes.map((size, i) => {
            const [w, d, h] = size; // w=x, d=y, h=z
            return (
              <AnimatedBox
                key={i}
                index={i}
                size={size}
                active={active}
                setActive={setActive}
                color={color[i]}
              />
              //   <a.mesh
              //     key={i}
              //     scale-y={String(i) === active ? scaleY : 1}
              //     onClick={() => setActive(String(i))}
              //     position={[i * 2 - (boxSizes.length - 1), h / 2, -i]} // geser Z setengah tinggi biar "rata bawah"
              //   >
              //     <boxGeometry args={[w, h, d]} />
              //     <meshStandardMaterial color="skyblue" />
              //   </a.mesh>
            );
          })}

          {/* <mesh
            rotation={[Math.PI / -2, 0, 0]}
            position={[0, 1, 0]}
            onClick={(e) => {
              setShowText((prev) => !prev);
              console.log(e.object);
            }}
          >
            <planeGeometry args={[2, 10]} />
            <meshStandardMaterial color={color} side={2} />
          </mesh> */}

          {/* <Text
            position={[0, 2, 2]} // taruh di atas box
            fontSize={0.5}
            color="black"
            anchorX="center"
            anchorY="bottom"
            visible={showText}
          >
            Bisa di Klik
          </Text> */}

          {/* bantu visualisasi */}
          <gridHelper args={[20, 20]} />
          <axesHelper args={[3]} />
          {/* <ExtrudedFromString /> */}
          {/* <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#00ffff" />
          </mesh> */}
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}

function AnimatedBox({
  size,
  index,
  active,
  setActive,
  onClickFunc,
  color,
}: {
  size: number[];
  index: number;
  active: string;
  setActive: Dispatch<SetStateAction<string>>;
  onClickFunc?: () => void;
  color: string;
}) {
  const [w, d, h] = size;

  const { scaleY, posY } = useSpring({
    scaleY: String(index) === active ? 2 : 1,
    posY: String(index) === active ? h : h / 2,
    config: { duration: 500, easing: easings.easeOutQuad },
  });

  return (
    <a.mesh
      onClick={(e) => {
        e.stopPropagation();
        setActive(String(index));
        onClickFunc?.();
      }}
      position-x={index * 2 - (boxSizes.length - 1)}
      position-y={posY} // animasi posisi Y
      position-z={-index}
      scale-y={scaleY} // animasi scale Y
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
    </a.mesh>
  );
}

function ExtrudedFromString() {
  const svgString = `
  <svg width="279" height="239" viewBox="0 0 279 239" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M198.93 0.410156C242.918 0.410156 278.578 35.074 278.578 77.834C278.578 117.54 247.831 150.263 208.219 154.735V238.551H0.59375V71.9648H119.507C122.592 31.9466 156.972 0.410156 198.93 0.410156Z" fill="#D9D9D9"/>
  </svg>
  `;

  const geometry = useMemo(() => {
    const loader = new SVGLoader();
    const svgData = loader.parse(svgString);

    const shapes = svgData.paths.flatMap((path) => path.toShapes(true));

    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 100,
      bevelEnabled: false,
    });

    geo.center(); // biar posisi di tengah
    return geo;
  }, [svgString]);

  return (
    <mesh geometry={geometry} scale={0.01} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}
