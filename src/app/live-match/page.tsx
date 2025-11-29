"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useLive, GameMode } from "@/contexts/LiveContext";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PlayerSelectionModal from "@/components/PlayerSelectionModal";
import WinnerModal from "@/components/WinnerModal";

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
  const [raceTo, setRaceTo] = useState(7); // Default race to 7
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [showRaceToInput, setShowRaceToInput] = useState(false);
  const [tempRaceTo, setTempRaceTo] = useState("7");
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const { isLive, setIsLive, gameMode, setGameMode } = useLive();
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

  // Get placeholder avatar based on player (consistent per player)
  const getPlayer1Placeholder = () => {
    if (player1?.id) {
      // Use hash of player ID to consistently pick a placeholder
      const hash = player1.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const placeholderNum = (hash % 6) + 1;
      return `/avatar-placeholder-${placeholderNum}.svg`;
    }
    return "/avatar-placeholder-1.svg";
  };

  const getPlayer2Placeholder = () => {
    if (player2?.id) {
      // Use hash of player ID to consistently pick a placeholder
      const hash = player2.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const placeholderNum = (hash % 6) + 1;
      return `/avatar-placeholder-${placeholderNum}.svg`;
    }
    return "/avatar-placeholder-yellow.svg";
  };

  // Determine ball numbers based on game mode
  const getBallNumbers = (mode: GameMode): number[] => {
    switch (mode) {
      case "9-ball":
        return [1, 2, 3, 4, 5, 6, 7, 8, 9];
      case "10-ball":
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      case "15-ball":
        return []; // 15-ball shows nothing
      default:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }
  };

  const ballNumbers = getBallNumbers(gameMode);

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

          // Restore pocketed balls
          if (
            matchData.pocketedBalls &&
            Array.isArray(matchData.pocketedBalls)
          ) {
            setPocketedBalls(new Set(matchData.pocketedBalls));
          }

          // Restore game mode
          if (
            matchData.gameMode &&
            ["9-ball", "10-ball", "15-ball"].includes(matchData.gameMode)
          ) {
            setGameMode(matchData.gameMode as GameMode);
          }

          // Restore raceTo
          if (matchData.raceTo !== undefined && typeof matchData.raceTo === "number") {
            setRaceTo(matchData.raceTo);
            setTempRaceTo(matchData.raceTo.toString());
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
    if (!isManager) {
      return;
    }
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
          pocketedBalls: Array.from(pocketedBalls),
          gameMode,
          raceTo,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving match data:", error);
      // Silently fail if not authenticated
    }
  };

  // Handle player selection
  const handlePlayer1Select = async (selectedPlayer: Player) => {
    if (!isManager) return;
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
    if (!isManager) return;
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

  // Winner detection - check if any player reached raceTo
  useEffect(() => {
    if (loading || showWinnerModal) return; // Don't trigger if modal already showing

    if (player1Score >= raceTo && player1) {
      setWinner(player1);
      setShowWinnerModal(true);
    } else if (player2Score >= raceTo && player2) {
      setWinner(player2);
      setShowWinnerModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1Score, player2Score, raceTo, player1?.id, player2?.id, loading, showWinnerModal]);

  // Save scores when they change
  useEffect(() => {
    if (!loading) {
      saveMatchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1Score, player2Score, currentTurn, loading, player1, player2, pocketedBalls, gameMode, raceTo]);

  // Handle ball click - toggles pocketed state
  const handleBallClick = (ballNumber: number) => {
    setPocketedBalls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ballNumber)) {
        newSet.delete(ballNumber);
      } else {
      newSet.add(ballNumber);
      }
      return newSet;
    });
  };

  // Reset all balls for a new game
  const handleResetBalls = useCallback(() => {
    setPocketedBalls(new Set());
  }, []);

  // Handle raceTo change
  const handleRaceToChange = () => {
    const newRaceTo = parseInt(tempRaceTo);
    if (!isNaN(newRaceTo) && newRaceTo > 0 && newRaceTo <= 50) {
      setRaceTo(newRaceTo);
      setShowRaceToInput(false);
      // Save to Firestore
      saveMatchData();
    }
  };

  // Handle winner modal close - reset scores
  const handleWinnerModalClose = useCallback(() => {
    setShowWinnerModal(false);
    setWinner(null);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setCurrentTurn(null);
    setPocketedBalls(new Set());
  }, []);

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

      // Handle Delete key FIRST (before other key checks)
      // Check multiple ways to detect Delete key
      const isDeleteKey = 
        e.key === "Delete" || 
        e.key === "Del" || 
        e.keyCode === 46 || 
        e.which === 46 ||
        (e.key === "Backspace" && !(e.target instanceof HTMLInputElement));

      if (isDeleteKey) {
        e.preventDefault();
        e.stopPropagation();
        // If winner modal is showing, reset the entire match
        if (showWinnerModal) {
          handleWinnerModalClose();
        } else {
          // Otherwise just reset balls (same as the reset button)
          handleResetBalls();
        }
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

      // Handle - (minus) key for decrementing raceTo
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setRaceTo((prev) => {
          const newValue = Math.max(1, prev - 1);
          // Save immediately to Firestore
          if (isManager && !loading) {
            const matchDocRef = doc(db, "current_match", "live");
            setDoc(
              matchDocRef,
              { raceTo: newValue, updatedAt: new Date().toISOString() },
              { merge: true }
            ).catch((error) => {
              console.error("Error saving raceTo:", error);
            });
          }
          return newValue;
        });
        return;
      }

      // Handle + (plus) key for incrementing raceTo
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setRaceTo((prev) => {
          const newValue = Math.min(50, prev + 1);
          // Save immediately to Firestore
          if (isManager && !loading) {
            const matchDocRef = doc(db, "current_match", "live");
            setDoc(
              matchDocRef,
              { raceTo: newValue, updatedAt: new Date().toISOString() },
              { merge: true }
            ).catch((error) => {
              console.error("Error saving raceTo:", error);
            });
          }
          return newValue;
        });
        return;
      }

      // Handle number keys 0-9 for ball toggling
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        const ballNumber = e.key === "0" ? 10 : parseInt(e.key);
        // Get ball numbers based on current game mode
        const currentBallNumbers = getBallNumbers(gameMode);
        // Toggle the ball's pocketed state only if it's in the current game
        if (currentBallNumbers.includes(ballNumber)) {
          setPocketedBalls((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(ballNumber)) {
              newSet.delete(ballNumber);
            } else {
              newSet.add(ballNumber);
            }
            return newSet;
          });
        }
        return;
      }

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
          // Z → Left arrow (player1's turn)
          e.preventDefault();
          setCurrentTurn("player1");
          break;

        case "x":
          // X → No arrow (no turn)
          e.preventDefault();
          setCurrentTurn(null);
          break;

        case "c":
          // C → Right arrow (player2's turn)
          e.preventDefault();
          setCurrentTurn("player2");
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
  }, [isManager, isLive, gameMode, handleResetBalls, loading, showWinnerModal, handleWinnerModalClose]);

  // Determine if player selection should be enabled
  const canSelectPlayers = isManager && !isLive;

  return (
    <div className="p-2 sm:p-4 md:p-6 h-screen flex flex-col bg-transparent overflow-hidden">
      <div className="mx-auto flex-1 flex flex-col relative w-full" style={{ maxWidth: "1920px" }}>
        {/* Live Button - Top Right Corner */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-20 md:right-12 z-10">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-base md:text-lg transition-all duration-300 ${
              isLive
                ? "bg-linear-to-r from-red-600 to-red-800 animate-pulse"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
          >
            {isLive ? "LIVE" : "GO LIVE"}
          </button>
        </div>

        {/* Team Scores Panel - Left Side */}
        <div className="absolute z-10 flex flex-col items-start space-y-3" style={{ top: "280px", left: "30px" }}>
          {/* Race To */}
          <div className="bg-gray-800 bg-opacity-80 px-4 py-2 text-white flex items-center space-x-2" style={{ minWidth: "140px" }}>
            <div className="text-lg sm:text-xl font-bold text-gray-300">Race to</div>
            <div className="text-lg sm:text-xl font-bold">5</div>
          </div>

          {/* Team 1 */}
          <div className="bg-red-700 bg-opacity-90 px-2 text-white flex items-center justify-between space-x-3" style={{ minWidth: "140px", paddingTop: "2px", paddingBottom: "2px" }}>
            <div className="flex items-center space-x-2">
              <div className="font-bold" style={{ fontSize: "22px" }}>Team 1</div>
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => setTeam1Score(prev => prev + 1)}
                  className="text-black hover:opacity-80 transition-opacity opacity-60"
                  title="Increment Team 1 Score"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setTeam1Score(prev => Math.max(0, prev - 1))}
                  className="text-black hover:opacity-80 transition-opacity opacity-60"
                  title="Decrement Team 1 Score"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="font-bold" style={{ fontSize: "24px", color: "#FFD700" }}>{team1Score}</div>
          </div>

          {/* Team 2 */}
          <div className="bg-blue-700 bg-opacity-90 px-2 text-white flex items-center justify-between space-x-3" style={{ minWidth: "140px", paddingTop: "2px", paddingBottom: "2px" }}>
            <div className="flex items-center space-x-2">
              <div className="font-bold" style={{ fontSize: "22px" }}>Team 2</div>
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => setTeam2Score(prev => prev + 1)}
                  className="text-black hover:opacity-80 transition-opacity opacity-60"
                  title="Increment Team 2 Score"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setTeam2Score(prev => Math.max(0, prev - 1))}
                  className="text-black hover:opacity-80 transition-opacity opacity-60"
                  title="Decrement Team 2 Score"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="font-bold" style={{ fontSize: "24px", color: "#FFD700" }}>{team2Score}</div>
          </div>
        </div>

        {/* Logo - Top Left Corner */}
        <div className="absolute z-10" style={{ top: "100px", left: "30px" }}>
          <Image
            src="/Owen.png"
            alt="Owen Logo"
            width={150}
            height={0}
            className="bg-white"
            style={{ width: "150px", height: "auto", borderRadius: "20%" }}
            unoptimized
          />
        </div>

        {/* Players Scoring Container - Bottom */}
        <div className="mt-auto w-full max-w-full mx-auto flex items-center justify-center px-2 sm:px-4 md:px-0">
          {/* Player 1 Section - Red Background */}
          <div className="bg-red-700 flex items-center h-12 sm:h-14 md:h-16 flex-1 justify-end">
            {/* Player 1 Profile Photo */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer1Modal(true);
                }
              }}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white ${
                canSelectPlayers
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              } ${
                getPlayer1Photo()
                  ? "bg-transparent"
                  : "bg-red-600"
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
                <Image
                  src={getPlayer1Placeholder()}
                  alt={getPlayer1Name()}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              )}
            </button>

            {/* Player 1 Name */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer1Modal(true);
                }
              }}
              className={`px-4 h-full flex items-center ${
                canSelectPlayers
                  ? "cursor-pointer hover:bg-red-800"
                  : "cursor-default"
              } transition-colors`}
            >
              <div className="text-xs sm:text-sm md:text-lg lg:text-xl xl:text-2xl font-bold text-white truncate max-w-[60px] sm:max-w-[80px] md:max-w-none">
                {getPlayer1Name()}
              </div>
            </button>

            {/* Chevron Left Indicator for Player 1 Turn */}
            <div className={`text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mx-1 sm:mx-1.5 md:mx-2 w-6 sm:w-8 md:w-10 lg:w-12 h-full flex items-center justify-center transition-opacity ${
              currentTurn === "player1" ? "opacity-100" : "opacity-0"
            }`} style={{ lineHeight: 1 }}>
              <span style={{ display: 'block', marginTop: '-0.1em' }}>‹</span>
            </div>
          </div>

          {/* Scores and Race To - Gradient Center */}
          <div
            className="flex items-center justify-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-5 bg-linear-to-r from-red-700 to-blue-700 h-12 sm:h-14 md:h-16 min-w-[120px] sm:min-w-[160px] md:min-w-[200px] lg:min-w-[240px] px-2 sm:px-3 md:px-4"
          >
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              {player1Score}
            </div>
            {showRaceToInput && isManager ? (
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  value={tempRaceTo}
                  onChange={(e) => setTempRaceTo(e.target.value)}
                  onBlur={handleRaceToChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRaceToChange();
                    } else if (e.key === "Escape") {
                      setShowRaceToInput(false);
                      setTempRaceTo(raceTo.toString());
                    }
                  }}
                  className="w-10 sm:w-12 md:w-14 lg:w-16 text-center text-xs sm:text-sm md:text-base lg:text-xl font-bold text-white bg-transparent border-2 border-white rounded px-1 sm:px-2"
                  min="1"
                  max="50"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  if (isManager) {
                    setShowRaceToInput(true);
                    setTempRaceTo(raceTo.toString());
                  }
                }}
                className={`text-xs sm:text-sm md:text-base lg:text-xl xl:text-2xl font-bold text-white ${
                  isManager
                    ? "cursor-pointer hover:opacity-80 underline"
                    : "cursor-default"
                }`}
                disabled={!isManager}
                title={isManager ? "Click to edit" : ""}
              >
                Race {raceTo}
              </button>
            )}
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              {player2Score}
            </div>
          </div>

          {/* Player 2 Section - Blue Background */}
          <div className="bg-blue-700 flex items-center h-12 sm:h-14 md:h-16 flex-1">
            {/* Chevron Right Indicator for Player 2 Turn */}
            <div className={`text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mx-1 sm:mx-1.5 md:mx-2 w-6 sm:w-8 md:w-10 lg:w-12 h-full flex items-center justify-center transition-opacity ${
              currentTurn === "player2" ? "opacity-100" : "opacity-0"
            }`} style={{ lineHeight: 1 }}>
              <span style={{ display: 'block', marginTop: '-0.1em' }}>›</span>
            </div>

            {/* Player 2 Name */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer2Modal(true);
                }
              }}
              className={`px-4 h-full flex items-center ${
                canSelectPlayers
                  ? "cursor-pointer hover:bg-blue-800"
                  : "cursor-default"
              } transition-colors`}
            >
              <div className="text-xs sm:text-sm md:text-lg lg:text-xl xl:text-2xl font-bold text-white truncate max-w-[60px] sm:max-w-[80px] md:max-w-none">
                {getPlayer2Name()}
              </div>
            </button>

            {/* Player 2 Profile Photo */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer2Modal(true);
                }
              }}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white ${
                canSelectPlayers
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              } ${
                getPlayer2Photo()
                  ? "bg-transparent"
                  : "bg-blue-600"
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
                <Image
                  src={getPlayer2Placeholder()}
                  alt={getPlayer2Name()}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          </div>
        </div>

        {/* Billiards Ball Icons & Game Mode Selector */}
        <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col items-center px-2">
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap justify-center">
            <div className="flex space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 bg-amber-50 rounded-full px-2 sm:px-4 md:px-6 py-1 flex-wrap justify-center">
              {ballNumbers.map((ballNum) => {
                const isPocketed = pocketedBalls.has(ballNum);
                return (
                  <div
                    key={ballNum}
                    onClick={() => handleBallClick(ballNum)}
                    className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold transition-all relative ${
                      isPocketed
                        ? "opacity-20 cursor-default"
                        : "cursor-pointer hover:scale-110"
                    }`}
                    title={
                      isPocketed
                        ? "Ball pocketed"
                        : "Click to pocket/unpocket ball"
                    }
                  >
                    <Image
                      src={`/ballicons/ball-${ballNum}.png`}
                      alt={`Ball ${ballNum}`}
                      width={48}
                      height={48}
                      className="object-contain w-full h-full"
                    />
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
                className="h-4 w-4 sm:h-5 sm:w-5"
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

        {/* Winner Modal */}
        <WinnerModal
          isOpen={showWinnerModal}
          onClose={handleWinnerModalClose}
          winner={winner}
          getPlayerPlaceholder={(playerId: string) => {
            const hash = playerId
              .split("")
              .reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const placeholderNum = (hash % 6) + 1;
            return `/avatar-placeholder-${placeholderNum}.svg`;
          }}
          player1Score={player1Score}
          player2Score={player2Score}
          player1Name={getPlayer1Name()}
          player2Name={getPlayer2Name()}
        />
      </div>
    </div>
  );
};

export default LiveMatchPage;