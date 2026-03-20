"use client";

import { useEffect, useState } from "react";
import { useLive, GameMode } from "@/contexts/LiveContext";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PbsCup2EightSingleOverlayMatchesOnly from "@/components/PbsCup2EightSingleOverlayMatchesOnly";

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  points: number;
}

export default function PbsCup2EightSingleOverlayPage() {
  const [players, setPlayers] = useState<Player[]>([]);

  const { pbsCup2IsLive: isLive, setPbsCup2IsLive: setIsLive } = useLive();
  const { isManager } = useAuth();

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const playersCollection = collection(db, "players");
        const playersSnapshot = await getDocs(playersCollection);
        const playersList = playersSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: (data.name as string) ?? "",
            photoURL: (data.photoURL as string) ?? "",
            points: (data.points as number) ?? 0,
          } as Player;
        });

        // Sort by points descending (keeps selection ordering consistent)
        setPlayers(playersList.sort((a, b) => b.points - a.points));
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };

    fetchPlayers();
  }, []);

  const canEdit = isManager && !isLive;

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

        <PbsCup2EightSingleOverlayMatchesOnly players={players} canEdit={canEdit} />
      </div>
    </div>
  );
}

