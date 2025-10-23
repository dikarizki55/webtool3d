"use client";
import { useAnimations, useGLTF } from "@react-three/drei";
import { act, JSX, useEffect, useRef } from "react";
import { Group } from "three";
import * as THREE from "three";
import { useScene } from "../context/sceneContext";

type ModelProps = JSX.IntrinsicElements["group"];

export default function Model(props: ModelProps) {
  const { day } = useScene();

  const { scene, animations } = useGLTF("/weather/sunb.glb");
  const group = useRef<Group>(null);
  const { actions } = useAnimations(animations, group);

  function stopAction(actName: string[]) {
    if (actName) {
      actName.map((item) => {
        actions[item]?.getMixer().stopAllAction();
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

    if (day) {
      playAnimation("sun up");
      playAnimation("moon down");
    } else {
      playAnimation("sun down");
      playAnimation("moon up");
    }
  }, [day, actions]);

  return <primitive ref={group} object={scene} {...props} />;
}
