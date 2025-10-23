"use client";

import { useState } from "react";
import { useScene } from "../context/sceneContext";

export default function NavBar() {
  return (
    <div className=" fixed top-0 left-1/2 -translate-x-1/2 bg-white/40 px-5 py-3 rounded-2xl backdrop-blur-xl z-10">
      <Switch />
    </div>
  );
}

function Switch() {
  //   const [on, setOn] = useState(false);
  const { day, setDay } = useScene();

  return (
    <div className=" flex items-center gap-3">
      <span
        className={`${day ? "" : " text-black/25"} transition-all duration-300`}
      >
        Day
      </span>
      <button
        className={` cursor-pointer rounded-full ${
          day ? "bg-white" : "bg-black/50"
        } p-1 w-12 transition-all duration-300`}
        onClick={() => setDay(!day)}
      >
        <div
          className={` ${
            !day ? "ml-5 bg-black" : "ml-0 bg-black/20"
          } transition-all duration-300 w-5 h-5 rounded-full`}
        ></div>
      </button>
      <span
        className={`${
          !day ? "" : " text-black/25"
        } transition-all duration-300`}
      >
        Night
      </span>
    </div>
  );
}
