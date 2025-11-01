"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { useScene } from "../context/sceneContext";

export default function NavBar() {
  const { night, setNight, cloudy, setCloudy } = useScene();
  return (
    <div className=" fixed top-0 left-1/2 -translate-x-1/2 bg-white/40 px-5 py-3 rounded-2xl backdrop-blur-xl z-10 flex flex-col gap-3">
      <Switch state={night} setState={setNight} on="Night" off="Day" />
      <Switch state={cloudy} setState={setCloudy} on="Cloudy" off="Sunny" />
    </div>
  );
}

function Switch({
  state,
  setState,
  off,
  on,
}: {
  state: boolean;
  setState: Dispatch<SetStateAction<boolean>>;
  off: string;
  on: string;
}) {
  const [time, setTime] = useState(Date.now());

  return (
    <div className=" grid grid-cols-3 gap-3 items-center">
      <span
        className={`${
          !state ? "" : " text-black/25"
        } transition-all duration-300`}
      >
        {off}
      </span>
      <button
        className={` cursor-pointer rounded-full ${
          !state ? "bg-white" : "bg-black/50"
        } p-1 w-12 transition-all duration-300`}
        onClick={() => {
          if (Date.now() - time > 1200) {
            setState(!state);
            setTime(Date.now());
          }
        }}
      >
        <div
          className={` ${
            state ? "ml-5 bg-black" : "ml-0 bg-black/20"
          } transition-all duration-300 w-5 h-5 rounded-full`}
        ></div>
      </button>
      <span
        className={`${
          state ? "" : " text-black/25"
        } transition-all duration-300 justify-self-end`}
      >
        {on}
      </span>
    </div>
  );
}
