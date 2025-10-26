"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LiveContextType {
  isLive: boolean;
  setIsLive: (isLive: boolean) => void;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export const LiveProvider = ({ children }: { children: ReactNode }) => {
  const [isLive, setIsLive] = useState(false);

  return (
    <LiveContext.Provider value={{ isLive, setIsLive }}>
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
