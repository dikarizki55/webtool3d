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
  day: boolean;
  setDay: Dispatch<SetStateAction<boolean>>;
};

const SceneContext = createContext<SceneType | null>(null);

export function SceneProvider({ children }: { children: ReactNode }) {
  const [day, setDay] = useState(true);

  return (
    <SceneContext.Provider value={{ day, setDay }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useFilter must be use with SceneContext");
  return ctx;
}
