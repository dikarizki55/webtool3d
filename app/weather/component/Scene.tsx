"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Model from "./Model";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSpring } from "@react-spring/three";

// This component is no longer needed as AutoOrbitCamera handles autorotation with smooth transitions
function RotatingCamera() {
  return null;
}

function AutoOrbitCamera({
  idleDelay = 2000,
  speed = 0.003,
}: {
  idleDelay?: number;
  speed?: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl } = useThree();
  const angleRef = useRef(0);

  const isInteractingRef = useRef<boolean>(false);
  const lastInteractionRef = useRef<number>(Date.now());
  const timeoutRef = useRef<number | null>(null);

  // Refs to track if we're in transition back to autorotate
  const inTransitionRef = useRef(false);

  // Track the autorotate position when interaction started
  const interactionStartPositionRef = useRef({
    x: 11 * Math.sin(0),
    y: 0,
    z: 11 * Math.cos(0),
  });
  const lastInteractionPositionRef = useRef({
    x: 0,
    y: 0,
    z: 0,
  });

  const [{ position }, setCameraSpring] = useSpring(() => ({
    position: [
      lastInteractionPositionRef.current.x,
      lastInteractionPositionRef.current.y,
      lastInteractionPositionRef.current.z,
    ], // Initial autorotate position
    config: { tension: 100, friction: 30, mass: 1 },
    onRest: () => {
      // When spring animation completes, stop the transition state
      if (inTransitionRef.current) {
        console.log("Spring animation completed - transition finished");
        inTransitionRef.current = false;
        // Update the angle to match the saved autorotate position
        angleRef.current = Math.atan2(
          interactionStartPositionRef.current.x,
          interactionStartPositionRef.current.z
        );
        console.log("Autorotate resumed from angle:", angleRef.current);
      }
    },
  }));

  // Initialize the state properly and handle cleanup
  useEffect(() => {
    console.log(
      "AutoOrbitCamera mounted - initial isInteractingRef:",
      isInteractingRef.current
    );
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  function handleInteraction() {
    console.log("Interaction detected - setting isInteractingRef to true");

    // If this is the start of interaction (not already interacting), save the current autorotate position
    if (!isInteractingRef.current) {
      // Save the expected autorotate position at this moment
      interactionStartPositionRef.current = {
        x: 11 * Math.sin(angleRef.current),
        y: 0,
        z: 11 * Math.cos(angleRef.current),
      };
      console.log(
        "Saved autorotate position when interaction started:",
        interactionStartPositionRef.current
      );
    }

    isInteractingRef.current = true;
    inTransitionRef.current = false; // Stop any ongoing transition
    lastInteractionRef.current = Date.now();

    // Clear any existing timeout to debounce the interaction
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set a new timeout to reset interaction state after idle period
    timeoutRef.current = window.setTimeout(() => {
      console.log(
        "Timeout executed - checking if enough time has passed since last interaction"
      );
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceLastInteraction >= idleDelay) {
        console.log(
          "No interaction for",
          idleDelay,
          "ms - starting smooth transition to autorotate"
        );

        const controls = controlsRef.current;
        if (!controls) return;

        lastInteractionPositionRef.current = {
          x: controls.object.position.x,
          y: controls.object.position.y,
          z: controls.object.position.z,
        };

        // Get current camera position (where user left it) - this is the start position for transition
        const startX = lastInteractionPositionRef.current.x;
        const startY = lastInteractionPositionRef.current.y;
        const startZ = lastInteractionPositionRef.current.z;

        console.log("Saving user's last camera position after interaction:", {
          x: startX,
          y: startY,
          z: startZ,
        });

        // Use the saved autorotate position when interaction started as the target
        const targetX = interactionStartPositionRef.current.x;
        const targetY = interactionStartPositionRef.current.y;
        const targetZ = interactionStartPositionRef.current.z;

        console.log(
          "Transitioning from user position:",
          { x: startX, y: startY, z: startZ },
          "to autorotate position:",
          { x: targetX, y: targetY, z: targetZ }
        );

        // Set the spring to the user's current position immediately as start position
        setCameraSpring.set({
          position: [startX, startY, startZ],
        });

        // Then animate to the autorotate position
        setCameraSpring.start({
          position: [targetX, targetY, targetZ],
          config: { tension: 100, friction: 30, mass: 1 },
          onRest: () => {
            // After the spring animation completes, make the camera look at (0,0,0)
            const controls = controlsRef.current;
            if (controls) {
              controls.target.set(0, 0, 0);
              controls.update();
            }
          },
        });

        // Mark that we're now in transition
        inTransitionRef.current = true;
        isInteractingRef.current = false;
      } else {
        console.log(
          "Recent interaction detected, not resetting. Time since last interaction:",
          timeSinceLastInteraction,
          "ms"
        );
      }
    }, idleDelay);
  }

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleControlStart = () => {
      handleInteraction();
    };
    const handleControlEnd = () => {
      handleInteraction();
    };

    // Only listen to start and end events from OrbitControls, not change
    // because change events fire during auto-rotation too
    controls.addEventListener("start", handleControlStart);
    controls.addEventListener("end", handleControlEnd);

    // Also listen to DOM events for direct user interaction
    const canvas = gl.domElement;

    // Track whether the pointer is currently pressed
    let isPointerPressed = false;

    const handlePointerDown = () => {
      isPointerPressed = true;
      handleInteraction();
    };

    const handlePointerUp = () => {
      isPointerPressed = false;
      handleInteraction();
    };

    const handlePointerMove = () => {
      if (isPointerPressed) {
        // Only call handleInteraction when the pointer is being held down and moved
        handleInteraction();
      }
    };

    const handleWheel = () => {
      handleInteraction();
    };

    const handleTouchStart = () => {
      handleInteraction();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });

    return () => {
      controls.removeEventListener("start", handleControlStart);
      controls.removeEventListener("end", handleControlEnd);

      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleTouchStart);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [idleDelay, speed, setCameraSpring]);

  useFrame(() => {
    // During interaction: let OrbitControls manage camera directly
    if (isInteractingRef.current) {
      camera.lookAt(new Vector3(0, 0, 0));
    }
    // During transition back to autorotate: apply spring animation
    else if (inTransitionRef.current) {
      const [x, y, z] = position.get();
      camera.position.set(x, y, z);
      camera.lookAt(new Vector3(0, 0, 0));
    }
    // Normal autorotate: follow circular path
    else {
      angleRef.current += speed;
      const radius = 11;
      const x = radius * Math.sin(angleRef.current);
      const z = radius * Math.cos(angleRef.current);
      camera.position.set(x, 0, z);
      camera.lookAt(new Vector3(0, 0, 0));
    }

    // Update controls when they exist
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  // Log the initial state once after the component mounts
  useEffect(() => {
    console.log(
      "Initial autorotate state - isInteractingRef:",
      isInteractingRef.current
    );
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

export default function Scene() {
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
