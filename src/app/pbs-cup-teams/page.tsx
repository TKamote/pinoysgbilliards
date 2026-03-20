"use client";

import { useLive } from "@/contexts/LiveContext";
import PbsCupTeamsOverlay from "@/components/PbsCupTeamsOverlay";

export default function PbsCupTeamsPage() {
  const { pbsCup2IsLive: isLive, setPbsCup2IsLive: setIsLive } = useLive();

  return (
    <div className="p-2 sm:p-4 md:p-6 h-screen flex flex-col bg-transparent overflow-hidden">
      <div className="mx-auto flex-1 flex flex-col relative w-full" style={{ maxWidth: "1920px" }}>
        {/* Live Button - Top Right Corner */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-20 md:right-12 z-10">
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={`text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-base md:text-lg transition-all duration-300 ${
              isLive ? "bg-linear-to-r from-red-600 to-red-800 animate-pulse" : "bg-gray-500 hover:bg-gray-600"
            }`}
          >
            {isLive ? "LIVE" : "GO LIVE"}
          </button>
        </div>

        <PbsCupTeamsOverlay />
      </div>
    </div>
  );
}

