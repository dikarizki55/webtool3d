"use client";
import { useAnimations, useGLTF } from "@react-three/drei";
import { JSX, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group } from "three";
import * as THREE from "three";
import { useScene } from "../context/sceneContext";

type ModelProps = JSX.IntrinsicElements["group"];

export default function Model(props: ModelProps) {
  const { night, cloudy } = useScene();

  const { scene, animations } = useGLTF("/weather/sun copy 3.glb");
  const group = useRef<Group>(null);
  const { actions } = useAnimations(animations, group);
  const [firstLoad, setFirstLoad] = useState(true);

  function stopAction(actName: string[]) {
    if (actName) {
      actName.map((item) => {
        actions[item]?.stop();
      });
    }
  }

  function playAnimation(actName: string) {
    const act = actions[actName];
    if (act) {
      act.loop = THREE.LoopOnce;
      act.clampWhenFinished = true;
      act.reset().play();
    }
  }

  useEffect(() => {
    if (!actions) return;
    stopAction(["sun up", "moon down", "moon up", "sun down"]);

    if (!night) {
      if (firstLoad) {
        playAnimation("sun up");
        setFirstLoad(false);
      } else {
        playAnimation("sun up");
        playAnimation("moon down");
      }
    } else {
      playAnimation("sun down");
      playAnimation("moon up");
    }

    // if (cloudy) {
    //   playAnimation("cloud up");
    // } else {
    //   playAnimation("cloud down");
    // }
  }, [night, actions]);

  useEffect(() => {
    stopAction(["cloud up", "cloud down"]);
    if (cloudy) {
      playAnimation("cloud up");
    } else {
      if (!firstLoad) playAnimation("cloud down");
    }
  }, [cloudy]);

  useLayoutEffect(() => {
    scene.traverse((child) => {
      // pastikan ini mesh
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive ref={group} object={scene} {...props} />;
}
