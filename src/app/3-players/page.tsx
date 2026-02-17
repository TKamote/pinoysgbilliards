"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useLive, GameMode } from "@/contexts/LiveContext";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PlayerSelectionModal from "@/components/PlayerSelectionModal";
import LogoSelectionModal, { type Logo } from "@/components/LogoSelectionModal";
import WinnerModal from "@/components/WinnerModal";

const DEFAULT_LOGO = "/PSGB_Logo.png";
const THREE_PLAYERS_CONFIG_ID = "3-players";

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  points: number;
}

const ThreePlayersPage = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [player3, setPlayer3] = useState<Player | null>(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [player3Score, setPlayer3Score] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<"player1" | "player2" | "player3" | null>(
    null
  );
  const [showPlayer1Modal, setShowPlayer1Modal] = useState(false);
  const [showPlayer2Modal, setShowPlayer2Modal] = useState(false);
  const [showPlayer3Modal, setShowPlayer3Modal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [raceTo, setRaceTo] = useState(7); // Default race to 7
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [showRaceToInput, setShowRaceToInput] = useState(false);
  const [tempRaceTo, setTempRaceTo] = useState("7");
  const [logo1URL, setLogo1URL] = useState<string>(DEFAULT_LOGO);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [showLogo1Modal, setShowLogo1Modal] = useState(false);
  const { threePlayersIsLive, setThreePlayersIsLive, threePlayersGameMode, setThreePlayersGameMode } =
    useLive();
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

  const getPlayer3Photo = () => {
    return player3?.photoURL || null;
  };

  // Get player name or default
  const getPlayer1Name = () => {
    if (player1?.name) return player1.name;
    return "Player 1";
  };

  const getPlayer2Name = () => {
    if (player2?.name) return player2.name;
    return "Player 2";
  };

  const getPlayer3Name = () => {
    if (player3?.name) return player3.name;
    return "Player 3";
  };

  // Get placeholder avatar based on player (consistent per player)
  const getPlayer1Placeholder = () => {
    if (player1?.id) {
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
      const hash = player2.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const placeholderNum = (hash % 6) + 1;
      return `/avatar-placeholder-${placeholderNum}.svg`;
    }
    return "/avatar-placeholder-2.svg";
  };

  const getPlayer3Placeholder = () => {
    if (player3?.id) {
      const hash = player3.id
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const placeholderNum = (hash % 6) + 1;
      return `/avatar-placeholder-${placeholderNum}.svg`;
    }
    return "/avatar-placeholder-3.svg";
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

  const ballNumbers = useMemo(() => {
    const mode = threePlayersGameMode || "9-ball";
    const balls = getBallNumbers(mode);
    if (balls.length === 0 && mode !== "15-ball") {
      console.log("Warning: ballNumbers is empty for mode:", mode);
    }
    return balls;
  }, [threePlayersGameMode]);

  // Track which balls are pocketed
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

        const sortedPlayers = playersList.sort((a, b) => b.points - a.points);
        setPlayers(sortedPlayers);
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };

    fetchPlayers();
  }, []);

  useEffect(() => {
    const loadLogoConfig = async () => {
      try {
        const configRef = doc(db, "config", THREE_PLAYERS_CONFIG_ID);
        const snap = await getDoc(configRef);
        if (snap.exists() && snap.data()?.logo1URL) setLogo1URL(snap.data()!.logo1URL);
      } catch (e) {
        console.error("Error loading logo config:", e);
      }
    };
    loadLogoConfig();
  }, []);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const snapshot = await getDocs(collection(db, "logos"));
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          return { id: d.id, name: (data.name ?? "") as string, logoURL: (data.logoURL ?? "") as string };
        });
        setLogos(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error("Error fetching logos:", e);
      }
    };
    fetchLogos();
  }, []);

  const handleSelectLogo = (logo: Logo) => {
    const url = logo.logoURL || "";
    setLogo1URL(url);
    setDoc(doc(db, "config", THREE_PLAYERS_CONFIG_ID), { logo1URL: url }, { merge: true }).catch(console.error);
  };

  // Load persisted match data from Firestore
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        const matchDocRef = doc(db, "current_match", "3-players");
        const matchDoc = await getDoc(matchDocRef);

        if (matchDoc.exists()) {
          const matchData = matchDoc.data();

          // Restore player 1
          if (matchData.player1Id) {
            if (players.length > 0) {
              const p1 = players.find((p) => p.id === matchData.player1Id);
              if (p1) {
                setPlayer1(p1);
              } else if (matchData.player1Name) {
                setPlayer1({
                  id: matchData.player1Id,
                  name: matchData.player1Name,
                  photoURL: matchData.player1PhotoURL || "",
                  points: 0,
                });
              }
            } else if (matchData.player1Name) {
              setPlayer1({
                id: matchData.player1Id,
                name: matchData.player1Name,
                photoURL: matchData.player1PhotoURL || "",
                points: 0,
              });
            }
          }

          // Restore player 2
          if (matchData.player2Id) {
            if (players.length > 0) {
              const p2 = players.find((p) => p.id === matchData.player2Id);
              if (p2) {
                setPlayer2(p2);
              } else if (matchData.player2Name) {
                setPlayer2({
                  id: matchData.player2Id,
                  name: matchData.player2Name,
                  photoURL: matchData.player2PhotoURL || "",
                  points: 0,
                });
              }
            } else if (matchData.player2Name) {
              setPlayer2({
                id: matchData.player2Id,
                name: matchData.player2Name,
                photoURL: matchData.player2PhotoURL || "",
                points: 0,
              });
            }
          }

          // Restore player 3
          if (matchData.player3Id) {
            if (players.length > 0) {
              const p3 = players.find((p) => p.id === matchData.player3Id);
              if (p3) {
                setPlayer3(p3);
              } else if (matchData.player3Name) {
                setPlayer3({
                  id: matchData.player3Id,
                  name: matchData.player3Name,
                  photoURL: matchData.player3PhotoURL || "",
                  points: 0,
                });
              }
            } else if (matchData.player3Name) {
              setPlayer3({
                id: matchData.player3Id,
                name: matchData.player3Name,
                photoURL: matchData.player3PhotoURL || "",
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
          if (matchData.player3Score !== undefined) {
            setPlayer3Score(matchData.player3Score);
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
            setThreePlayersGameMode(matchData.gameMode as GameMode);
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

    loadMatchData();
  }, [players, setThreePlayersGameMode]);

  // Update player objects when players array loads
  useEffect(() => {
    if (players.length > 0 && (player1?.id || player2?.id || player3?.id)) {
      if (player1?.id) {
        const freshP1 = players.find((p) => p.id === player1.id);
        if (freshP1 && (!player1.photoURL || freshP1.photoURL !== player1.photoURL)) {
          setPlayer1(freshP1);
        }
      }
      if (player2?.id) {
        const freshP2 = players.find((p) => p.id === player2.id);
        if (freshP2 && (!player2.photoURL || freshP2.photoURL !== player2.photoURL)) {
          setPlayer2(freshP2);
        }
      }
      if (player3?.id) {
        const freshP3 = players.find((p) => p.id === player3.id);
        if (freshP3 && (!player3.photoURL || freshP3.photoURL !== player3.photoURL)) {
          setPlayer3(freshP3);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // Save match data to Firestore
  const saveMatchData = async () => {
    if (!isManager) {
      return;
    }
    try {
      const matchDocRef = doc(db, "current_match", "3-players");
      await setDoc(
        matchDocRef,
        {
          player1Id: player1?.id || null,
          player2Id: player2?.id || null,
          player3Id: player3?.id || null,
          player1Name: player1?.name || "Player 1",
          player2Name: player2?.name || "Player 2",
          player3Name: player3?.name || "Player 3",
          player1PhotoURL: player1?.photoURL || "",
          player2PhotoURL: player2?.photoURL || "",
          player3PhotoURL: player3?.photoURL || "",
          player1Score,
          player2Score,
          player3Score,
          currentTurn,
          pocketedBalls: Array.from(pocketedBalls),
          gameMode: threePlayersGameMode,
          raceTo,
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
    if (!isManager) return;
    setPlayer1(selectedPlayer);
    try {
      const matchDocRef = doc(db, "current_match", "3-players");
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
    try {
      const matchDocRef = doc(db, "current_match", "3-players");
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

  const handlePlayer3Select = async (selectedPlayer: Player) => {
    if (!isManager) return;
    setPlayer3(selectedPlayer);
    try {
      const matchDocRef = doc(db, "current_match", "3-players");
      await setDoc(
        matchDocRef,
        {
          player3Id: selectedPlayer.id,
          player3Name: selectedPlayer.name,
          player3PhotoURL: selectedPlayer.photoURL || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving player 3:", error);
    }
  };

  // Winner detection - check if any player reached raceTo
  useEffect(() => {
    if (loading || showWinnerModal) return;

    if (player1Score >= raceTo && player1) {
      setWinner(player1);
      setShowWinnerModal(true);
    } else if (player2Score >= raceTo && player2) {
      setWinner(player2);
      setShowWinnerModal(true);
    } else if (player3Score >= raceTo && player3) {
      setWinner(player3);
      setShowWinnerModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1Score, player2Score, player3Score, raceTo, player1?.id, player2?.id, player3?.id, loading, showWinnerModal]);

  // Save scores when they change
  useEffect(() => {
    if (!loading) {
      saveMatchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1Score, player2Score, player3Score, currentTurn, loading, player1, player2, player3, pocketedBalls, threePlayersGameMode, raceTo]);

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
      saveMatchData();
    }
  };

  // Handle winner modal close - reset scores
  const handleWinnerModalClose = useCallback(() => {
    setShowWinnerModal(false);
    setWinner(null);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setPlayer3Score(0);
    setCurrentTurn(null);
    setPocketedBalls(new Set());
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle Delete key
      const isDeleteKey = 
        e.key === "Delete" || 
        e.key === "Del" || 
        e.keyCode === 46 || 
        e.which === 46 ||
        (e.key === "Backspace" && !(e.target instanceof HTMLInputElement));

      if (isDeleteKey) {
        e.preventDefault();
        e.stopPropagation();
        if (showWinnerModal) {
          handleWinnerModalClose();
        } else {
          handleResetBalls();
        }
        return;
      }

      // Handle Tab key for turn cycling
      if (e.key === "Tab") {
        e.preventDefault();
        setCurrentTurn((prev) => {
          if (prev === "player1") return "player2";
          if (prev === "player2") return "player3";
          if (prev === "player3") return "player1";
          return "player1";
        });
        return;
      }

      const key = e.key.toLowerCase();

      // Handle - (minus) key for decrementing raceTo
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setRaceTo((prev) => {
          const newValue = Math.max(1, prev - 1);
          if (isManager && !loading) {
            const matchDocRef = doc(db, "current_match", "3-players");
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
          if (isManager && !loading) {
            const matchDocRef = doc(db, "current_match", "3-players");
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
        const currentBallNumbers = getBallNumbers(threePlayersGameMode);
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
          setPlayer1Score((prev) => prev + 1);
          break;
        case "a":
          setPlayer1Score((prev) => Math.max(0, prev - 1));
          break;
        case "w":
          setPlayer2Score((prev) => prev + 1);
          break;
        case "s":
          setPlayer2Score((prev) => Math.max(0, prev - 1));
          break;
        case "e":
          setPlayer3Score((prev) => prev + 1);
          break;
        case "d":
          setPlayer3Score((prev) => Math.max(0, prev - 1));
          break;
        case "z":
          e.preventDefault();
          setCurrentTurn("player1");
          break;
        case "x":
          e.preventDefault();
          setCurrentTurn("player2");
          break;
        case "c":
          e.preventDefault();
          setCurrentTurn("player3");
          break;
        case "v":
          e.preventDefault();
          setCurrentTurn(null);
          break;
        case "r":
          e.preventDefault();
          const now = Date.now();
          if (now - lastResetPress.current < RESET_TIMEOUT) {
            setPlayer1Score(0);
            setPlayer2Score(0);
            setPlayer3Score(0);
            setCurrentTurn(null);
            lastResetPress.current = 0;
          } else {
            lastResetPress.current = now;
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isManager, threePlayersIsLive, threePlayersGameMode, handleResetBalls, loading, showWinnerModal, handleWinnerModalClose]);

  // Determine if player selection should be enabled
  const canSelectPlayers = isManager && !threePlayersIsLive;

  return (
    <div className="p-2 sm:p-4 md:p-6 h-screen flex flex-col bg-transparent overflow-hidden">
      <div className="mx-auto flex-1 flex flex-col relative w-full" style={{ maxWidth: "1920px" }}>
        {/* Logo - Top Left; pick from Players tab */}
        <button type="button" onClick={() => canSelectPlayers && setShowLogo1Modal(true)} className={`absolute top-4 left-4 z-10 text-left ${canSelectPlayers ? "cursor-pointer hover:opacity-90" : "cursor-default"}`} title={canSelectPlayers ? "Pick logo from Players tab" : ""}>
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-[50%] overflow-hidden border-2 border-white bg-white shadow flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo1URL || DEFAULT_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </button>
        <LogoSelectionModal isOpen={showLogo1Modal} onClose={() => setShowLogo1Modal(false)} logos={logos} selectedLogoURL={logo1URL || null} onSelect={(logo) => { handleSelectLogo(logo); setShowLogo1Modal(false); }} title="Select Logo" />

        {/* Live Button - Top Right Corner */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-20 md:right-12 z-10">
          <button
            onClick={() => setThreePlayersIsLive(!threePlayersIsLive)}
            className={`text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-base md:text-lg transition-all duration-300 ${
              threePlayersIsLive
                ? "bg-linear-to-r from-red-600 to-red-800 animate-pulse"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
          >
            {threePlayersIsLive ? "LIVE" : "GO LIVE"}
          </button>
        </div>

        {/* Ring Games Title and Race To - Above Players */}
        <div className="mt-auto mb-2 w-full max-w-full mx-auto flex items-center justify-center px-2 sm:px-4 md:px-0">
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 bg-gray-800 bg-opacity-90 px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-lg">
            <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
              Ring Games:
            </div>
            {showRaceToInput && isManager ? (
              <div className="flex items-center space-x-1">
                <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">Race to</span>
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
                  className="w-12 sm:w-14 md:w-16 lg:w-20 text-center text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white bg-transparent border-2 border-white rounded px-2 sm:px-3"
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
                className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white ${
                  isManager
                    ? "cursor-pointer hover:opacity-80 underline"
                    : "cursor-default"
                }`}
                disabled={!isManager}
                title={isManager ? "Click to edit" : ""}
              >
                Race to {raceTo}
              </button>
            )}
          </div>
        </div>

        {/* Players Scoring Container - Bottom - 80% width on desktop; 2x photos, overflow visible */}
        <div className="w-full flex justify-center">
          <div className="w-full md:w-[80%] flex items-center justify-center px-2 sm:px-4 md:px-0 overflow-visible">
          {/* Player 1 Section - Red Background */}
          <div className="bg-red-700 flex items-center h-12 sm:h-14 md:h-16 flex-1 overflow-visible">
            {/* Player 1 Profile Photo - 2x size */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer1Modal(true);
                }
              }}
              className={`w-16 h-16 sm:w-[80px] sm:h-[80px] md:w-[96px] md:h-[96px] lg:w-[112px] lg:h-[112px] rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white ${
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
              className={`px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 h-full flex items-center flex-1 min-w-0 ${
                canSelectPlayers
                  ? "cursor-pointer hover:bg-red-800"
                  : "cursor-default"
              } transition-colors`}
            >
              <div className="text-sm sm:text-xl md:text-2xl lg:text-[38px] xl:text-[44px] font-bold text-white truncate w-full">
                {getPlayer1Name()}
              </div>
            </button>

            {/* Turn Indicator for Player 1 */}
            <div className={`text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mx-1 sm:mx-1.5 md:mx-2 w-6 sm:w-8 md:w-10 lg:w-12 h-full flex items-center justify-center transition-all shrink-0 ${
              currentTurn === "player1" 
                ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                : "opacity-0"
            }`} style={{ lineHeight: 1 }}>
              <span style={{ display: 'block', marginTop: '-0.1em' }}>‹</span>
            </div>

            {/* Player 1 Score */}
            <div className="px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 h-full flex items-center justify-center shrink-0">
              <div className="text-base sm:text-xl md:text-3xl lg:text-[38px] xl:text-5xl font-bold text-white whitespace-nowrap">
                {player1Score}
              </div>
            </div>
          </div>

          {/* Player 2 Section - Yellow Background */}
          <div className="bg-yellow-600 flex items-center h-12 sm:h-14 md:h-16 flex-1 overflow-visible">
            {/* Player 2 Profile Photo - 2x size */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer2Modal(true);
                }
              }}
              className={`w-16 h-16 sm:w-[80px] sm:h-[80px] md:w-[96px] md:h-[96px] lg:w-[112px] lg:h-[112px] rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white ${
                canSelectPlayers
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              } ${
                getPlayer2Photo()
                  ? "bg-transparent"
                  : "bg-yellow-500"
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

            {/* Player 2 Name */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer2Modal(true);
                }
              }}
              className={`px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 h-full flex items-center flex-1 min-w-0 ${
                canSelectPlayers
                  ? "cursor-pointer hover:bg-yellow-700"
                  : "cursor-default"
              } transition-colors`}
            >
              <div className="text-sm sm:text-xl md:text-2xl lg:text-[38px] xl:text-[44px] font-bold text-white truncate w-full">
                {getPlayer2Name()}
              </div>
            </button>

            {/* Turn Indicator for Player 2 */}
            <div className={`text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mx-1 sm:mx-1.5 md:mx-2 w-6 sm:w-8 md:w-10 lg:w-12 h-full flex items-center justify-center transition-all shrink-0 ${
              currentTurn === "player2" 
                ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                : "opacity-0"
            }`} style={{ lineHeight: 1 }}>
              <span style={{ display: 'block', marginTop: '-0.1em' }}>↑</span>
            </div>

            {/* Player 2 Score */}
            <div className="px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 h-full flex items-center justify-center shrink-0">
              <div className="text-base sm:text-xl md:text-3xl lg:text-[38px] xl:text-5xl font-bold text-white whitespace-nowrap">
                {player2Score}
              </div>
            </div>
          </div>

          {/* Player 3 Section - Blue Background */}
          <div className="bg-blue-700 flex items-center h-12 sm:h-14 md:h-16 flex-1 overflow-visible">
            {/* Player 3 Profile Photo - 2x size */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer3Modal(true);
                }
              }}
              className={`w-16 h-16 sm:w-[80px] sm:h-[80px] md:w-[96px] md:h-[96px] lg:w-[112px] lg:h-[112px] rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white ${
                canSelectPlayers
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              } ${
                getPlayer3Photo()
                  ? "bg-transparent"
                  : "bg-blue-600"
              }`}
            >
              {getPlayer3Photo() ? (
                <Image
                  src={getPlayer3Photo()!}
                  alt={getPlayer3Name()}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <Image
                  src={getPlayer3Placeholder()}
                  alt={getPlayer3Name()}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              )}
            </button>

            {/* Player 3 Name */}
            <button
              onClick={() => {
                if (canSelectPlayers) {
                  setShowPlayer3Modal(true);
                }
              }}
              className={`px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 h-full flex items-center flex-1 min-w-0 ${
                canSelectPlayers
                  ? "cursor-pointer hover:bg-blue-800"
                  : "cursor-default"
              } transition-colors`}
            >
              <div className="text-sm sm:text-xl md:text-2xl lg:text-[38px] xl:text-[44px] font-bold text-white truncate w-full">
                {getPlayer3Name()}
              </div>
            </button>

            {/* Turn Indicator for Player 3 */}
            <div className={`text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mx-1 sm:mx-1.5 md:mx-2 w-6 sm:w-8 md:w-10 lg:w-12 h-full flex items-center justify-center transition-all shrink-0 ${
              currentTurn === "player3" 
                ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                : "opacity-0"
            }`} style={{ lineHeight: 1 }}>
              <span style={{ display: 'block', marginTop: '-0.1em' }}>›</span>
            </div>

            {/* Player 3 Score */}
            <div className="px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 h-full flex items-center justify-center shrink-0">
              <div className="text-base sm:text-xl md:text-3xl lg:text-[38px] xl:text-5xl font-bold text-white whitespace-nowrap">
                {player3Score}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Billiards Ball Icons */}
        <div className="mt-2 sm:mt-3 md:mt-4 flex flex-col items-center px-2 pb-4">
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-wrap justify-center">
            <div className="flex space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 bg-amber-50 rounded-full px-2 sm:px-4 md:px-6 py-1 flex-wrap justify-center">
              {ballNumbers.length > 0 ? (
                ballNumbers.map((ballNum) => {
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
                        unoptimized
                      />
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 px-2">No balls for {threePlayersGameMode || "current"} mode</div>
              )}
            </div>

            {/* Reset Icon Button */}
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

        <PlayerSelectionModal
          isOpen={showPlayer3Modal}
          onClose={() => setShowPlayer3Modal(false)}
          players={players}
          selectedPlayerId={player3?.id || null}
          onSelect={handlePlayer3Select}
          title="Select Player 3"
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

export default ThreePlayersPage;

