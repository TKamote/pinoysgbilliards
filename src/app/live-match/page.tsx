"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useLive } from "@/contexts/LiveContext";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PlayerSelectionModal from "@/components/PlayerSelectionModal";

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  points: number;
}

const LiveMatchPage = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<"player1" | "player2" | null>(
    null
  );
  const [showPlayer1Modal, setShowPlayer1Modal] = useState(false);
  const [showPlayer2Modal, setShowPlayer2Modal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isLive, setIsLive } = useLive();
  const { isManager } = useAuth();

  // Double-press R for reset tracking
  const lastResetPress = useRef<number>(0);
  const RESET_TIMEOUT = 500; // 500ms window for double-press

  // Get player photo URL (returns null if no photo)
  const getPlayer1Photo = () => {
    return player1?.photoURL || null;
  };

  const getPlayer2Photo = () => {
    return player2?.photoURL || null;
  };

  // Get player name or default
  const getPlayer1Name = () => {
    if (player1?.name) return player1.name;
    return "Owen";
  };

  const getPlayer2Name = () => {
    if (player2?.name) return player2.name;
    return "Dave";
  };

  // Track which balls are pocketed (removed)
  const [pocketedBalls, setPocketedBalls] = useState<Set<number>>(new Set());

  // Fetch players from Firestore
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const playersCollection = collection(db, "players");
        const playersSnapshot = await getDocs(playersCollection);
        const playersList = playersSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            photoURL: data.photoURL || "",
            points: data.points || 0,
          } as Player;
        });

        // Sort by points descending
        const sortedPlayers = playersList.sort((a, b) => b.points - a.points);
        setPlayers(sortedPlayers);
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };

    fetchPlayers();
  }, []);

  // Load persisted match data from Firestore
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        const matchDocRef = doc(db, "current_match", "live");
        const matchDoc = await getDoc(matchDocRef);

        if (matchDoc.exists()) {
          const matchData = matchDoc.data();

          // Restore player 1 - try to find in players array first, otherwise use saved data
          if (matchData.player1Id) {
            if (players.length > 0) {
              const p1 = players.find((p) => p.id === matchData.player1Id);
              if (p1) {
                setPlayer1(p1);
              } else if (matchData.player1Name) {
                // Fallback: create player object from saved data
                setPlayer1({
                  id: matchData.player1Id,
                  name: matchData.player1Name,
                  photoURL: matchData.player1PhotoURL || "",
                  points: 0,
                });
              }
            } else if (matchData.player1Name) {
              // Players not loaded yet, use saved data
              setPlayer1({
                id: matchData.player1Id,
                name: matchData.player1Name,
                photoURL: matchData.player1PhotoURL || "",
                points: 0,
              });
            }
          }

          // Restore player 2 - try to find in players array first, otherwise use saved data
          if (matchData.player2Id) {
            if (players.length > 0) {
              const p2 = players.find((p) => p.id === matchData.player2Id);
              if (p2) {
                setPlayer2(p2);
              } else if (matchData.player2Name) {
                // Fallback: create player object from saved data
                setPlayer2({
                  id: matchData.player2Id,
                  name: matchData.player2Name,
                  photoURL: matchData.player2PhotoURL || "",
                  points: 0,
                });
              }
            } else if (matchData.player2Name) {
              // Players not loaded yet, use saved data
              setPlayer2({
                id: matchData.player2Id,
                name: matchData.player2Name,
                photoURL: matchData.player2PhotoURL || "",
                points: 0,
              });
            }
          }

          // Restore scores
          if (matchData.player1Score !== undefined) {
            setPlayer1Score(matchData.player1Score);
          }
          if (matchData.player2Score !== undefined) {
            setPlayer2Score(matchData.player2Score);
          }
        }
      } catch (error) {
        console.error("Error loading match data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Load match data (will use saved photoURLs if players not loaded yet)
    loadMatchData();
  }, [players]);

  // Update player objects when players array loads (to get fresh data including updated photos)
  useEffect(() => {
    if (players.length > 0 && (player1?.id || player2?.id)) {
      // Update player 1 with fresh data from players array if it exists
      if (player1?.id) {
        const freshP1 = players.find((p) => p.id === player1.id);
        if (freshP1) {
          // Only update if photoURL changed or if current photoURL is empty
          if (!player1.photoURL || freshP1.photoURL !== player1.photoURL) {
            setPlayer1(freshP1);
          }
        }
      }

      // Update player 2 with fresh data from players array if it exists
      if (player2?.id) {
        const freshP2 = players.find((p) => p.id === player2.id);
        if (freshP2) {
          // Only update if photoURL changed or if current photoURL is empty
          if (!player2.photoURL || freshP2.photoURL !== player2.photoURL) {
            setPlayer2(freshP2);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // Save match data to Firestore (scores and turn)
  const saveMatchData = async () => {
    try {
      const matchDocRef = doc(db, "current_match", "live");
      await setDoc(
        matchDocRef,
        {
          player1Id: player1?.id || null,
          player2Id: player2?.id || null,
          player1Name: player1?.name || "Owen",
          player2Name: player2?.name || "Dave",
          player1PhotoURL: player1?.photoURL || "",
          player2PhotoURL: player2?.photoURL || "",
          player1Score,
          player2Score,
          currentTurn,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving match data:", error);
    }
  };

  // Handle player selection
  const handlePlayer1Select = async (selectedPlayer: Player) => {
    setPlayer1(selectedPlayer);
    // Save to Firestore with all player data
    try {
      const matchDocRef = doc(db, "current_match", "live");
      await setDoc(
        matchDocRef,
        {
          player1Id: selectedPlayer.id,
          player1Name: selectedPlayer.name,
          player1PhotoURL: selectedPlayer.photoURL || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving player 1:", error);
    }
  };

  const handlePlayer2Select = async (selectedPlayer: Player) => {
    setPlayer2(selectedPlayer);
    // Save to Firestore with all player data
    try {
      const matchDocRef = doc(db, "current_match", "live");
      await setDoc(
        matchDocRef,
        {
          player2Id: selectedPlayer.id,
          player2Name: selectedPlayer.name,
          player2PhotoURL: selectedPlayer.photoURL || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving player 2:", error);
    }
  };

  // Save scores when they change
  useEffect(() => {
    if (!loading) {
      saveMatchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1Score, player2Score, currentTurn, loading, player1, player2]);

  // Handle ball click - removes/pockets the ball
  const handleBallClick = (ballNumber: number) => {
    setPocketedBalls((prev) => {
      const newSet = new Set(prev);
      newSet.add(ballNumber);
      return newSet;
    });
  };

  // Reset all balls for a new game
  const handleResetBalls = () => {
    setPocketedBalls(new Set());
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle Tab key separately (before lowercasing)
      if (e.key === "Tab") {
        e.preventDefault();
        setCurrentTurn((prev) => {
          if (prev === "player1") return "player2";
          return "player1"; // Handles both "player2" and null
        });
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case "q":
          // Increment Player 1 score
          setPlayer1Score((prev) => prev + 1);
          break;

        case "a":
          // Decrement Player 1 score (prevent negative)
          setPlayer1Score((prev) => Math.max(0, prev - 1));
          break;

        case "e":
          // Increment Player 2 score
          setPlayer2Score((prev) => prev + 1);
          break;

        case "d":
          // Decrement Player 2 score (prevent negative)
          setPlayer2Score((prev) => Math.max(0, prev - 1));
          break;

        case "z":
          // Z → Reset indicator to no turn
          e.preventDefault();
          setCurrentTurn(null);
          break;

        case "r":
          // Double-press R to reset scores
          e.preventDefault();
          const now = Date.now();
          if (now - lastResetPress.current < RESET_TIMEOUT) {
            // Double-press detected - reset scores
            setPlayer1Score(0);
            setPlayer2Score(0);
            setCurrentTurn(null); // Reset turn indicator
            lastResetPress.current = 0; // Reset counter
          } else {
            // First press - record timestamp
            lastResetPress.current = now;
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const ballColors = [
    { num: 1, color: "bg-red-500" },
    { num: 2, color: "bg-yellow-500" },
    { num: 3, color: "bg-blue-500" },
    { num: 4, color: "bg-purple-500" },
    { num: 5, color: "bg-orange-500" },
    { num: 6, color: "bg-green-500" },
    { num: 7, color: "bg-pink-500" },
    { num: 8, color: "bg-gray-800" },
    { num: 9, color: "bg-yellow-400" },
    { num: 10, color: "bg-white border-2 border-gray-400" },
  ];

  // Determine if player selection should be enabled
  const canSelectPlayers = isManager && !isLive;

  return (
    <div className="p-6 h-screen flex flex-col bg-transparent">
      <div className="max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Live Button - Top Right Corner */}
        <div className="absolute" style={{ top: "80px", right: "50px" }}>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`text-white px-4 py-2 rounded-full font-bold text-lg transition-all duration-300 ${
              isLive
                ? "bg-linear-to-r from-red-600 to-red-800 animate-pulse"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
          >
            {isLive ? "LIVE" : "GO LIVE"}
          </button>
        </div>

        {/* Logo - Bottom Left Corner */}
        <div className="absolute" style={{ bottom: "20px", left: "20px" }}>
          <Image
            src="/favicon.png"
            alt="Logo"
            width={100}
            height={100}
            className="opacity-70"
            style={{ borderRadius: "20px" }}
            unoptimized
          />
        </div>

        {/* Players Scoring Container - Bottom */}
        <div className="bg-white rounded-lg shadow-lg px-1 py-1 mt-auto w-fit mx-auto">
          <div className="flex items-center justify-between">
            {/* Player 1 Profile Photo with Turn Indicator */}
            <button
              onClick={() => canSelectPlayers && setShowPlayer1Modal(true)}
              disabled={!canSelectPlayers}
              className={`w-14 h-14 rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center ${
                currentTurn === "player1"
                  ? "border-4 border-gray-600 shadow-xl shadow-gray-600/80 ring-4 ring-gray-600/30"
                  : "border-2 border-blue-500"
              } ${
                canSelectPlayers
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              } ${
                getPlayer1Photo()
                  ? "bg-transparent"
                  : "bg-linear-to-br from-blue-400 to-blue-600"
              }`}
            >
              {getPlayer1Photo() ? (
                <Image
                  src={getPlayer1Photo()!}
                  alt={getPlayer1Name()}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </button>

            {/* Center Content */}
            <div className="flex items-center justify-center space-x-2 flex-1">
              {/* Player 1 Name */}
              <button
                onClick={() => canSelectPlayers && setShowPlayer1Modal(true)}
                disabled={!canSelectPlayers}
                className={`bg-red-500 px-28 py-3 ${
                  canSelectPlayers
                    ? "cursor-pointer hover:bg-red-600"
                    : "cursor-default"
                } transition-colors`}
              >
                <div className="text-2xl font-bold text-white">
                  {getPlayer1Name()}
                </div>
              </button>

              {/* Scores and VS */}
              <div
                className="flex items-center justify-center space-x-5 bg-linear-to-r from-red-600 to-blue-600"
                style={{ width: "calc(2rem + 8rem + 2rem)", height: "3.5rem" }}
              >
                <div className="text-5xl font-bold text-white">
                  {player1Score}
                </div>
                <div className="text-1.5xl font-bold text-white">VS</div>
                <div className="text-5xl font-bold text-white">
                  {player2Score}
                </div>
              </div>

              {/* Player 2 Name */}
              <button
                onClick={() => canSelectPlayers && setShowPlayer2Modal(true)}
                disabled={!canSelectPlayers}
                className={`bg-blue-600 px-28 py-3 ${
                  canSelectPlayers
                    ? "cursor-pointer hover:bg-blue-700"
                    : "cursor-default"
                } transition-colors`}
              >
                <div className="text-2xl font-bold text-white">
                  {getPlayer2Name()}
                </div>
              </button>
            </div>

            {/* Player 2 Profile Photo with Turn Indicator */}
            <button
              onClick={() => canSelectPlayers && setShowPlayer2Modal(true)}
              disabled={!canSelectPlayers}
              className={`w-14 h-14 rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center ${
                currentTurn === "player2"
                  ? "border-4 border-gray-600 shadow-xl shadow-gray-600/80 ring-4 ring-gray-600/30"
                  : "border-2 border-green-500"
              } ${
                canSelectPlayers
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              } ${
                getPlayer2Photo()
                  ? "bg-transparent"
                  : "bg-linear-to-br from-green-400 to-green-600"
              }`}
            >
              {getPlayer2Photo() ? (
                <Image
                  src={getPlayer2Photo()!}
                  alt={getPlayer2Name()}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </button>
          </div>
        </div>

        {/* Billiards Ball Icons */}
        <div className="mt-4 flex flex-col items-center">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-4 bg-amber-50 rounded-full px-6 py-1">
              {ballColors.map((ball) => {
                const isPocketed = pocketedBalls.has(ball.num);
                const isBall10 = ball.num === 10;

                return (
                  <div
                    key={ball.num}
                    onClick={() => !isPocketed && handleBallClick(ball.num)}
                    className={`w-12 h-12 ${
                      ball.color
                    } rounded-full flex items-center justify-center font-bold transition-all ${
                      isBall10 ? "text-gray-800" : "text-white"
                    } ${
                      isPocketed
                        ? "opacity-0 cursor-default"
                        : "cursor-pointer hover:scale-110"
                    }`}
                    style={{ fontSize: "22px" }}
                    title={
                      isPocketed ? "Ball pocketed" : "Click to pocket ball"
                    }
                  >
                    {ball.num}
                  </div>
                );
              })}
            </div>

            {/* Reset Icon Button - Subtle, outside background */}
            <button
              onClick={handleResetBalls}
              className="text-gray-400 hover:text-gray-600 transition-colors opacity-60 hover:opacity-100"
              title="Reset all balls"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Player Selection Modals */}
        <PlayerSelectionModal
          isOpen={showPlayer1Modal}
          onClose={() => setShowPlayer1Modal(false)}
          players={players}
          selectedPlayerId={player1?.id || null}
          onSelect={handlePlayer1Select}
          title="Select Player 1"
        />

        <PlayerSelectionModal
          isOpen={showPlayer2Modal}
          onClose={() => setShowPlayer2Modal(false)}
          players={players}
          selectedPlayerId={player2?.id || null}
          onSelect={handlePlayer2Select}
          title="Select Player 2"
        />
      </div>
    </div>
  );
};

export default LiveMatchPage;
