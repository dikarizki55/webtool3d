"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  SetStateAction,
} from "react";

interface BuildingData {
  id: string;
  coordinates: [number, number][];
  height: number;
  color: string;
}

interface ThreeDSceneContextType {
  calcScale: number;
  coordinateScale: number;
  setCoordinateScale: React.Dispatch<SetStateAction<number>>;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  setBounds: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  buildings: BuildingData[];
  setBuildings: React.Dispatch<SetStateAction<BuildingData[]>>;
  // setBuildings: (buildings: BuildingData[]) => void;
  selectedBuilding: string | null;
  setSelectedBuilding: (id: string | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  baseHeight: number;
  setBaseHeight: (height: number) => void;
}

const ThreeDSceneContext = createContext<ThreeDSceneContextType | undefined>(
  undefined
);

interface ThreeDSceneProviderProps {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  children: ReactNode;
}

export const ThreeDSceneProvider = ({
  bounds: initialBounds,
  children,
}: ThreeDSceneProviderProps) => {
  const [coordinateScale, setCoordinateScale] = useState(100);
  const [bounds, setBounds] = useState(initialBounds);
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseHeight, setBaseHeight] = useState(1);

  // 1/1 = 1000000
  const calcScale = coordinateScale !== 0 ? 1000000 / coordinateScale : 10000;

  return (
    <ThreeDSceneContext.Provider
      value={{
        calcScale,
        coordinateScale,
        setCoordinateScale,
        bounds,
        setBounds,
        buildings,
        setBuildings,
        selectedBuilding,
        setSelectedBuilding,
        loading,
        setLoading,
        baseHeight,
        setBaseHeight,
      }}
    >
      {children}
    </ThreeDSceneContext.Provider>
  );
};

export const useThreeDScene = () => {
  const context = useContext(ThreeDSceneContext);
  if (context === undefined) {
    throw new Error("useThreeDScene must be used within a ThreeDSceneProvider");
  }
  return context;
};
