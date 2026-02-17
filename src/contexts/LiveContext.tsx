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
  pbsTourIsLive: boolean;
  setPbsTourIsLive: (isLive: boolean) => void;
  pbsTourGameMode: GameMode;
  setPbsTourGameMode: (gameMode: GameMode) => void;
  pbsTour2IsLive: boolean;
  setPbsTour2IsLive: (isLive: boolean) => void;
  pbsTour2GameMode: GameMode;
  setPbsTour2GameMode: (gameMode: GameMode) => void;
  threePlayersIsLive: boolean;
  setThreePlayersIsLive: (isLive: boolean) => void;
  threePlayersGameMode: GameMode;
  setThreePlayersGameMode: (gameMode: GameMode) => void;
  tourManagerIsLive: boolean;
  setTourManagerIsLive: (isLive: boolean) => void;
  tourManagerGameMode: GameMode;
  setTourManagerGameMode: (gameMode: GameMode) => void;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const LiveProvider = ({ children }: { children: ReactNode }) => {
  const [isLive, setIsLive] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("9-ball");
  const [pbsLiveIsLive, setPbsLiveIsLive] = useState(false);
  const [pbsGameMode, setPbsGameMode] = useState<GameMode>("9-ball");
  const [pbsTourIsLive, setPbsTourIsLive] = useState(false);
  const [pbsTourGameMode, setPbsTourGameMode] = useState<GameMode>("9-ball");
  const [pbsTour2IsLive, setPbsTour2IsLive] = useState(false);
  const [pbsTour2GameMode, setPbsTour2GameMode] = useState<GameMode>("9-ball");
  const [threePlayersIsLive, setThreePlayersIsLive] = useState(false);
  const [threePlayersGameMode, setThreePlayersGameMode] = useState<GameMode>("9-ball");
  const [tourManagerIsLive, setTourManagerIsLive] = useState(false);
  const [tourManagerGameMode, setTourManagerGameMode] = useState<GameMode>("9-ball");

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
        pbsTourIsLive,
        setPbsTourIsLive,
        pbsTourGameMode,
        setPbsTourGameMode,
        pbsTour2IsLive,
        setPbsTour2IsLive,
        pbsTour2GameMode,
        setPbsTour2GameMode,
        threePlayersIsLive,
        setThreePlayersIsLive,
        threePlayersGameMode,
        setThreePlayersGameMode,
        tourManagerIsLive,
        setTourManagerIsLive,
        tourManagerGameMode,
        setTourManagerGameMode,
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
