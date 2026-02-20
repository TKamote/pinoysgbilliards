"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useLive, GameMode } from "@/contexts/LiveContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PlayerSelectionModal from "@/components/PlayerSelectionModal";
import LogoSelectionModal, { type Logo } from "@/components/LogoSelectionModal";
import WinnerModal from "@/components/WinnerModal";

const DEFAULT_LOGO = "/PSGB_Logo.png";
const PBS_CUP_8_CONFIG_ID = "pbs-cup-8";
const PBS_CUP_8_MATCH_ID = "pbs-cup-8";

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  points: number;
}

type TeamSlot = { player: Player | null; score: number };

const initialTeams = (): TeamSlot[] =>
  Array.from({ length: 8 }, () => ({ player: null, score: 0 }));

const getBallNumbers = (mode: GameMode): number[] => {
  switch (mode) {
    case "9-ball":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9];
    case "10-ball":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    case "15-ball":
      return [];
    default:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }
};

const getPlaceholder = (playerId: string | undefined) => {
  if (!playerId) return "/avatar-placeholder-1.svg";
  const hash = playerId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const n = (hash % 6) + 1;
  return `/avatar-placeholder-${n}.svg`;
};

const PBSCup8Page = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamSlot[]>(initialTeams);
  const [loading, setLoading] = useState(true);
  const [raceTo, setRaceTo] = useState(5);
  const [showRaceToInput, setShowRaceToInput] = useState(false);
  const [tempRaceTo, setTempRaceTo] = useState("5");
  const [logo1URL, setLogo1URL] = useState<string>(DEFAULT_LOGO);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [showLogo1Modal, setShowLogo1Modal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [pocketedBalls, setPocketedBalls] = useState<Set<number>>(new Set());
  const [showTeamModalIndex, setShowTeamModalIndex] = useState<number | null>(null);

  const { pbsCup8IsLive, setPbsCup8IsLive, pbsCup8GameMode, setPbsCup8GameMode } = useLive();
  const { user } = useAuth();
  const { showLimitReachedModal } = useUsage();
  const canSelectPlayers = !!user && !pbsCup8IsLive;
  const ballNumbers = getBallNumbers(pbsCup8GameMode);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const snap = await getDocs(collection(db, "players"));
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "",
            photoURL: data.photoURL || "",
            points: data.points || 0,
          } as Player;
        });
        setPlayers(list.sort((a, b) => b.points - a.points));
      } catch (e) {
        console.error("Error fetching players:", e);
      }
    };
    fetchPlayers();
  }, []);

  useEffect(() => {
    const loadLogoConfig = async () => {
      try {
        const configRef = doc(db, "config", PBS_CUP_8_CONFIG_ID);
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

  // Load match data from Firestore
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        const matchRef = doc(db, "current_match", PBS_CUP_8_MATCH_ID);
        const snap = await getDoc(matchRef);
        if (!snap.exists()) {
          setLoading(false);
          return;
        }
        const data = snap.data();
        const next: TeamSlot[] = initialTeams();
        for (let i = 0; i < 8; i++) {
          const n = i + 1;
          const id = data[`team${n}Id`];
          const name = data[`team${n}Name`];
          const photoURL = data[`team${n}PhotoURL`];
          const score = data[`team${n}Score`];
          if (id && name) {
            const fromList = players.find((p) => p.id === id);
            next[i] = {
              player: fromList || { id, name, photoURL: photoURL || "", points: 0 },
              score: typeof score === "number" ? score : 0,
            };
          } else if (typeof score === "number") {
            next[i].score = score;
          }
        }
        setTeams(next);
        // Do not restore raceTo from Firestore - keep default 5 (same as Live Match left panel)
        if (data.gameMode && ["9-ball", "10-ball", "15-ball"].includes(data.gameMode)) {
          setPbsCup8GameMode(data.gameMode as GameMode);
        }
        if (data.pocketedBalls && Array.isArray(data.pocketedBalls)) {
          setPocketedBalls(new Set(data.pocketedBalls));
        }
      } catch (e) {
        console.error("Error loading match data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadMatchData();
  }, [players, setPbsCup8GameMode]);

  const saveMatchData = useCallback(async () => {
    if (!user) return;
    try {
      const payload: Record<string, unknown> = {
        raceTo,
        gameMode: pbsCup8GameMode,
        pocketedBalls: Array.from(pocketedBalls),
        updatedAt: new Date().toISOString(),
      };
      for (let i = 0; i < 8; i++) {
        const n = i + 1;
        payload[`team${n}Id`] = teams[i].player?.id ?? null;
        payload[`team${n}Name`] = teams[i].player?.name ?? `Team ${n}`;
        payload[`team${n}PhotoURL`] = teams[i].player?.photoURL ?? "";
        payload[`team${n}Score`] = teams[i].score;
      }
      await setDoc(doc(db, "current_match", PBS_CUP_8_MATCH_ID), payload, { merge: true });
    } catch (error) {
      if ((error as { code?: string })?.code === "permission-denied") showLimitReachedModal();
      else console.error("Error saving match data:", error);
    }
  }, [user, raceTo, pbsCup8GameMode, pocketedBalls, teams, showLimitReachedModal]);

  useEffect(() => {
    if (loading) return;
    saveMatchData();
  }, [teams, raceTo, pbsCup8GameMode, pocketedBalls, loading, saveMatchData]);

  const handleTeamSelect = useCallback(
    async (index: number, selected: Player) => {
      setTeams((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], player: selected };
        return next;
      });
      try {
        const n = index + 1;
        await setDoc(
          doc(db, "current_match", PBS_CUP_8_MATCH_ID),
          {
            [`team${n}Id`]: selected.id,
            [`team${n}Name`]: selected.name,
            [`team${n}PhotoURL`]: selected.photoURL || "",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        if ((error as { code?: string })?.code === "permission-denied") showLimitReachedModal();
        else console.error("Error saving team:", error);
      }
      setShowTeamModalIndex(null);
    },
    [showLimitReachedModal]
  );

  const setTeamScore = useCallback((index: number, delta: number) => {
    setTeams((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], score: Math.max(0, next[index].score + delta) };
      return next;
    });
  }, []);

  const handleSelectLogo = (logo: Logo) => {
    const url = logo.logoURL || "";
    setLogo1URL(url);
    setDoc(doc(db, "config", PBS_CUP_8_CONFIG_ID), { logo1URL: url }, { merge: true }).catch((e) => {
      if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
    });
  };

  // Winner: first team to reach raceTo
  useEffect(() => {
    if (loading || showWinnerModal) return;
    for (let i = 0; i < 8; i++) {
      if (teams[i].score >= raceTo && teams[i].player) {
        setWinner(teams[i].player);
        setShowWinnerModal(true);
        return;
      }
    }
  }, [teams, raceTo, loading, showWinnerModal]);

  const handleRaceToChange = () => {
    const n = parseInt(tempRaceTo, 10);
    if (!isNaN(n) && n >= 1 && n <= 50) {
      setRaceTo(n);
      setShowRaceToInput(false);
    }
  };

  const handleWinnerModalClose = useCallback(() => {
    setShowWinnerModal(false);
    setWinner(null);
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
  }, []);

  const handleResetBalls = useCallback(() => setPocketedBalls(new Set()), []);
  const handleBallClick = (ballNumber: number) => {
    setPocketedBalls((prev) => {
      const next = new Set(prev);
      if (next.has(ballNumber)) next.delete(ballNumber);
      else next.add(ballNumber);
      return next;
    });
  };

  const lastResetPress = useRef(0);
  const RESET_TIMEOUT = 500;

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Handle - (minus) key for decrementing raceTo
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setRaceTo((prev) => {
          const newValue = Math.max(1, prev - 1);
          if (user && !loading) {
            setDoc(
              doc(db, "current_match", PBS_CUP_8_MATCH_ID),
              { raceTo: newValue, updatedAt: new Date().toISOString() },
              { merge: true }
            ).catch((err) => console.error("Error saving raceTo:", err));
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
          if (user && !loading) {
            setDoc(
              doc(db, "current_match", PBS_CUP_8_MATCH_ID),
              { raceTo: newValue, updatedAt: new Date().toISOString() },
              { merge: true }
            ).catch((err) => console.error("Error saving raceTo:", err));
          }
          return newValue;
        });
        return;
      }

      if (e.key === "Delete" || e.key === "Del" || e.keyCode === 46) {
        e.preventDefault();
        if (showWinnerModal) handleWinnerModalClose();
        else handleResetBalls();
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const now = Date.now();
        if (now - lastResetPress.current < RESET_TIMEOUT) {
          setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
          lastResetPress.current = 0;
        } else {
          lastResetPress.current = now;
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showWinnerModal, handleWinnerModalClose, handleResetBalls, user, loading]);

  return (
    <div className="p-2 sm:p-4 md:p-6 h-screen flex flex-col bg-transparent overflow-hidden">
      <div className="mx-auto flex-1 flex flex-col relative w-full" style={{ maxWidth: "1920px" }}>
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <button
            onClick={() => setPbsCup8IsLive(!pbsCup8IsLive)}
            className={`text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-base ${
              pbsCup8IsLive ? "bg-red-600 animate-pulse" : "bg-gray-500 hover:bg-gray-600"
            }`}
          >
            {pbsCup8IsLive ? "LIVE" : "GO LIVE"}
          </button>
        </div>

        {/* Left: 8 teams, then Race to 5 below (same width as teams, red background); top offset keeps gap below logo */}
        <div className="absolute z-10 flex flex-col items-start space-y-2 overflow-visible" style={{ top: "160px", left: "30px" }}>
          {teams.map((slot, index) => {
            const isDark = Math.floor(index / 2) % 2 === 1;
            const name = slot.player?.name ?? `Team ${index + 1}`;
            const photo = slot.player?.photoURL || null;
            const placeholder = getPlaceholder(slot.player?.id);
            return (
              <div
                key={index}
                className={`px-2 py-1 flex items-center justify-between space-x-2 overflow-visible ${
                  isDark ? "bg-black text-white" : "bg-gray-200 text-gray-900"
                }`}
                style={{ minWidth: "198px" }}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-visible">
                  <button
                    type="button"
                    onClick={() => canSelectPlayers && setShowTeamModalIndex(index)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 border-2 flex items-center justify-center -my-1 ${
                      canSelectPlayers ? "cursor-pointer hover:opacity-80" : "cursor-default"
                    } ${isDark ? "border-white" : "border-gray-700"} ${!photo && isDark ? "bg-gray-800" : ""} ${!photo && !isDark ? "bg-gray-300" : ""}`}
                  >
                    {photo ? (
                      <Image src={photo} alt={name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <Image src={placeholder} alt={name} width={56} height={56} className="w-full h-full object-cover" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => canSelectPlayers && setShowTeamModalIndex(index)}
                    className={`flex-1 min-w-0 text-left font-bold text-sm truncate ${canSelectPlayers ? "hover:opacity-80" : ""}`}
                    style={{ fontSize: "18px" }}
                  >
                    {name}
                  </button>
                  <div className="flex flex-col space-y-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTeamScore(index, 1)}
                      className="opacity-60 hover:opacity-100"
                      title="Increment"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamScore(index, -1)}
                      className="opacity-60 hover:opacity-100"
                      title="Decrement"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="font-bold shrink-0" style={{ fontSize: "22px", color: isDark ? "#FFD700" : "#B45309" }}>
                  {slot.score}
                </div>
              </div>
            );
          })}
          {/* Race to 5 - below last team, same width as teams, red background */}
          <div className="bg-red-600 px-4 py-2 text-white flex items-center space-x-2" style={{ minWidth: "198px" }}>
            <div className="text-lg sm:text-xl font-bold">Race to</div>
            <div className="text-lg sm:text-xl font-bold">5</div>
          </div>
        </div>

        {/* Logo top-left (above teams) */}
        <button
          type="button"
          onClick={() => canSelectPlayers && setShowLogo1Modal(true)}
          className={`absolute z-10 ${canSelectPlayers ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
          style={{ top: "30px", left: "30px" }}
          title={canSelectPlayers ? "Pick logo" : ""}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white bg-white shadow flex items-center justify-center">
            <img src={logo1URL || DEFAULT_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </button>
        <LogoSelectionModal
          isOpen={showLogo1Modal}
          onClose={() => setShowLogo1Modal(false)}
          logos={logos}
          selectedLogoURL={logo1URL || null}
          onSelect={(logo) => {
            handleSelectLogo(logo);
            setShowLogo1Modal(false);
          }}
          title="Select Logo"
        />

        {/* Players Scoring Container - Bottom (same as Live Match): Team 1 | Race to X | Team 2 */}
        <div className="mt-auto w-full md:w-[70%] max-w-full mx-auto flex items-center justify-center px-2 sm:px-4 md:px-0 overflow-visible">
          {/* Player 1 (Team 1) - Dark Indigo: Photo | Name | Score */}
          <div className="bg-indigo-900 flex items-center h-12 sm:h-14 md:h-16 flex-1 min-w-0 overflow-visible">
            <button
              onClick={() => canSelectPlayers && setShowTeamModalIndex(0)}
              className={`w-20 h-20 sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px] lg:w-[140px] lg:h-[140px] rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white ${
                canSelectPlayers ? "cursor-pointer hover:opacity-80" : "cursor-default"
              } ${teams[0]?.player?.photoURL ? "bg-transparent" : "bg-indigo-800"}`}
            >
              {teams[0]?.player?.photoURL ? (
                <Image src={teams[0].player.photoURL} alt={teams[0].player?.name ?? "Team 1"} width={56} height={56} className="w-full h-full object-cover" unoptimized />
              ) : (
                <Image src={getPlaceholder(teams[0]?.player?.id)} alt={teams[0]?.player?.name ?? "Team 1"} width={56} height={56} className="w-full h-full object-cover" />
              )}
            </button>
            <button
              onClick={() => canSelectPlayers && setShowTeamModalIndex(0)}
              className={`flex-1 min-w-0 h-full flex items-center justify-center ${canSelectPlayers ? "cursor-pointer hover:bg-indigo-800" : "cursor-default"} transition-colors px-2`}
            >
              <div className="text-sm sm:text-xl md:text-2xl lg:text-[38px] xl:text-[44px] font-bold text-white truncate text-center w-full">
                {teams[0]?.player?.name ?? "Team 1"}
              </div>
            </button>
            <div className="text-base sm:text-xl md:text-3xl lg:text-[38px] xl:text-5xl font-bold text-white shrink-0 mx-1 sm:mx-1.5 md:mx-2">
              {teams[0]?.score ?? 0}
            </div>
            <div className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mx-1 sm:mx-1.5 md:mx-2 w-6 sm:w-8 md:w-10 lg:w-12 h-full flex items-center justify-center opacity-0 shrink-0" style={{ lineHeight: 1 }}>
              <span style={{ display: "block", marginTop: "-0.1em" }}>‹</span>
            </div>
          </div>

          {/* Race To - Center (gradient indigo) */}
          <div className="flex items-center justify-center bg-gradient-to-r from-indigo-900 to-indigo-800 h-12 sm:h-14 md:h-16 min-w-[120px] sm:min-w-[160px] md:min-w-[200px] lg:min-w-[240px] px-2 sm:px-3 md:px-4">
            {showRaceToInput && user ? (
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  value={tempRaceTo}
                  onChange={(e) => setTempRaceTo(e.target.value)}
                  onBlur={handleRaceToChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRaceToChange();
                    if (e.key === "Escape") {
                      setShowRaceToInput(false);
                      setTempRaceTo(raceTo.toString());
                    }
                  }}
                  className="w-10 sm:w-12 md:w-14 lg:w-16 text-center text-xs sm:text-sm md:text-base lg:text-xl font-bold text-white bg-transparent border-2 border-white rounded px-1 sm:px-2"
                  min={1}
                  max={50}
                  autoFocus
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => user && (setShowRaceToInput(true), setTempRaceTo(raceTo.toString()))}
                className={`text-xs sm:text-sm md:text-base lg:text-xl xl:text-2xl font-bold text-white ${user ? "cursor-pointer hover:opacity-80 underline" : "cursor-default"}`}
                disabled={!user}
                title={user ? "Click to edit" : ""}
              >
                Race {raceTo}
              </button>
            )}
          </div>

          {/* Player 2 (Team 2) - Dark Indigo (lighter): Score | Name | Photo */}
          <div className="bg-indigo-800 flex items-center h-12 sm:h-14 md:h-16 flex-1 min-w-0 overflow-visible">
            <div className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mx-1 sm:mx-1.5 md:mx-2 w-6 sm:w-8 md:w-10 lg:w-12 h-full flex items-center justify-center opacity-0 shrink-0" style={{ lineHeight: 1 }}>
              <span style={{ display: "block", marginTop: "-0.1em" }}>›</span>
            </div>
            <div className="text-base sm:text-xl md:text-3xl lg:text-[38px] xl:text-5xl font-bold text-white shrink-0 mx-1 sm:mx-1.5 md:mx-2">
              {teams[1]?.score ?? 0}
            </div>
            <button
              onClick={() => canSelectPlayers && setShowTeamModalIndex(1)}
              className={`flex-1 min-w-0 h-full flex items-center justify-center ${canSelectPlayers ? "cursor-pointer hover:bg-indigo-700" : "cursor-default"} transition-colors px-2`}
            >
              <div className="text-sm sm:text-xl md:text-2xl lg:text-[38px] xl:text-[44px] font-bold text-white truncate text-center w-full">
                {teams[1]?.player?.name ?? "Team 2"}
              </div>
            </button>
            <button
              onClick={() => canSelectPlayers && setShowTeamModalIndex(1)}
              className={`w-20 h-20 sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px] lg:w-[140px] lg:h-[140px] rounded-full overflow-hidden shrink-0 transition-all duration-300 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white ${
                canSelectPlayers ? "cursor-pointer hover:opacity-80" : "cursor-default"
              } ${teams[1]?.player?.photoURL ? "bg-transparent" : "bg-indigo-700"}`}
            >
              {teams[1]?.player?.photoURL ? (
                <Image src={teams[1].player.photoURL} alt={teams[1].player?.name ?? "Team 2"} width={56} height={56} className="w-full h-full object-cover" unoptimized />
              ) : (
                <Image src={getPlaceholder(teams[1]?.player?.id)} alt={teams[1]?.player?.name ?? "Team 2"} width={56} height={56} className="w-full h-full object-cover" />
              )}
            </button>
          </div>
        </div>

        {/* Billiards Ball Icons (same as Live Match) */}
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
                      isPocketed ? "opacity-20 cursor-default" : "cursor-pointer hover:scale-110"
                    }`}
                    title={isPocketed ? "Ball pocketed" : "Click to pocket/unpocket ball"}
                  >
                    <Image src={`/ballicons/ball-${ballNum}.png`} alt={`Ball ${ballNum}`} width={48} height={48} className="object-contain w-full h-full" />
                  </div>
                );
              })}
            </div>
            <button onClick={handleResetBalls} className="text-gray-400 hover:text-gray-600 transition-colors opacity-60 hover:opacity-100" title="Reset all balls">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {showTeamModalIndex !== null && (
          <PlayerSelectionModal
            isOpen={true}
            onClose={() => setShowTeamModalIndex(null)}
            players={players}
            selectedPlayerId={teams[showTeamModalIndex]?.player?.id ?? null}
            onSelect={(p) => handleTeamSelect(showTeamModalIndex, p)}
            title={`Select Team ${showTeamModalIndex + 1}`}
          />
        )}

        <WinnerModal
          isOpen={showWinnerModal}
          onClose={handleWinnerModalClose}
          winner={winner}
          getPlayerPlaceholder={(id) => getPlaceholder(id)}
          player1Score={winner ? teams.find((t) => t.player?.id === winner.id)?.score ?? 0 : 0}
          player2Score={raceTo}
          player1Name={winner?.name ?? ""}
          player2Name={`Race to ${raceTo}`}
        />
      </div>
    </div>
  );
};

export default PBSCup8Page;
