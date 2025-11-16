"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type GameMode = "9-ball" | "10-ball" | "15-ball";

interface LiveContextType {
  isLive: boolean;
  setIsLive: (isLive: boolean) => void;
  gameMode: GameMode;
  setGameMode: (gameMode: GameMode) => void;
  pbsLiveIsLive: boolean;
  setPbsLiveIsLive: (isLive: boolean) => void;
  pbsGameMode: GameMode;
  setPbsGameMode: (gameMode: GameMode) => void;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const LiveProvider = ({ children }: { children: ReactNode }) => {
  const [isLive, setIsLive] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("9-ball");
  const [pbsLiveIsLive, setPbsLiveIsLive] = useState(false);
  const [pbsGameMode, setPbsGameMode] = useState<GameMode>("9-ball");

  return (
    <LiveContext.Provider
      value={{
        isLive,
        setIsLive,
        gameMode,
        setGameMode,
        pbsLiveIsLive,
        setPbsLiveIsLive,
        pbsGameMode,
        setPbsGameMode,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};

export const useLive = () => {
  const context = useContext(LiveContext);
  if (context === undefined) {
    throw new Error("useLive must be used within a LiveProvider");
  }
  return context;
};
