"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

type SceneType = {
  night: boolean;
  setNight: Dispatch<SetStateAction<boolean>>;
  cloudy: boolean;
  setCloudy: Dispatch<SetStateAction<boolean>>;
};

const SceneContext = createContext<SceneType | null>(null);

export function SceneProvider({ children }: { children: ReactNode }) {
  const [night, setNight] = useState(false);
  const [cloudy, setCloudy] = useState(false);

  return (
    <SceneContext.Provider value={{ night, setNight, cloudy, setCloudy }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useFilter must be use with SceneContext");
  return ctx;
}
