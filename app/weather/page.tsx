import React from "react";
import SceneR from "./component/SceneR";
import { SceneProvider } from "./context/sceneContext";
import NavBar from "./component/NavBar";

export default function page() {
  return (
    <SceneProvider>
      <NavBar />
      <div className=" w-full h-screen bg-[rgb(156,195,255)]">
        {/* <Scene /> */}
        <SceneR />
      </div>
    </SceneProvider>
  );
}
