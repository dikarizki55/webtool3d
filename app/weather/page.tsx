import React from "react";
import SceneR from "./component/SceneR";
import { SceneProvider } from "./context/sceneContext";
import NavBar from "./component/NavBar";

export default function page() {
  return (
    <SceneProvider>
      <NavBar />
      <div className=" w-full h-screen">
        {/* <Scene /> */}
        <SceneR />
      </div>
    </SceneProvider>
  );
}
