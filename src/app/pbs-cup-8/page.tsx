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

type TeamSlot = { player: Player | null; score: number; hidden?: boolean };

const initialTeams = (): TeamSlot[] =>
  Array.from({ length: 8 }, () => ({ player: null, score: 0, hidden: false }));

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
  // Bottom bar: two selectable players (independent from the 8 teams)
  const [barPlayer1, setBarPlayer1] = useState<Player | null>(null);
  const [barPlayer2, setBarPlayer2] = useState<Player | null>(null);
  const [showBarPlayer1Modal, setShowBarPlayer1Modal] = useState(false);
  const [showBarPlayer2Modal, setShowBarPlayer2Modal] = useState(false);
  const [playerUIScore1, setPlayerUIScore1] = useState(0);
  const [playerUIScore2, setPlayerUIScore2] = useState(0);

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
          const hidden = data[`team${n}Hidden`] === true;
          if (id && name) {
            const fromList = players.find((p) => p.id === id);
            next[i] = {
              player: fromList || { id, name, photoURL: photoURL || "", points: 0 },
              score: typeof score === "number" ? score : 0,
              hidden,
            };
          } else if (typeof score === "number") {
            next[i].score = score;
            next[i].hidden = hidden;
          } else {
            next[i].hidden = hidden;
          }
        }
        setTeams(next);
        if (data?.raceTo && typeof data.raceTo === "number") setRaceTo(Math.min(50, Math.max(1, data.raceTo)));
        if (data?.gameMode && ["9-ball", "10-ball", "15-ball"].includes(data.gameMode)) {
          setPbsCup8GameMode(data.gameMode as GameMode);
        }
        if (data?.pocketedBalls && Array.isArray(data.pocketedBalls)) {
          setPocketedBalls(new Set(data.pocketedBalls));
        }
        if (typeof data?.playerUIScore1 === "number") setPlayerUIScore1(data.playerUIScore1);
        if (typeof data?.playerUIScore2 === "number") setPlayerUIScore2(data.playerUIScore2);
        // Bottom bar players (not tied to team1/team2)
        const bar1Id = data?.barPlayer1Id;
        const bar1Name = data?.barPlayer1Name;
        const bar2Id = data?.barPlayer2Id;
        const bar2Name = data?.barPlayer2Name;
        if (bar1Id && bar1Name) {
          const p1 = players.find((p) => p.id === bar1Id);
          setBarPlayer1(p1 || { id: bar1Id, name: bar1Name, photoURL: (data.barPlayer1PhotoURL as string) || "", points: 0 });
        } else setBarPlayer1(null);
        if (bar2Id && bar2Name) {
          const p2 = players.find((p) => p.id === bar2Id);
          setBarPlayer2(p2 || { id: bar2Id, name: bar2Name, photoURL: (data.barPlayer2PhotoURL as string) || "", points: 0 });
        } else setBarPlayer2(null);
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
        playerUIScore1,
        playerUIScore2,
        barPlayer1Id: barPlayer1?.id ?? null,
        barPlayer1Name: barPlayer1?.name ?? null,
        barPlayer1PhotoURL: barPlayer1?.photoURL ?? "",
        barPlayer2Id: barPlayer2?.id ?? null,
        barPlayer2Name: barPlayer2?.name ?? null,
        barPlayer2PhotoURL: barPlayer2?.photoURL ?? "",
        updatedAt: new Date().toISOString(),
      };
      for (let i = 0; i < 8; i++) {
        const n = i + 1;
        payload[`team${n}Id`] = teams[i].player?.id ?? null;
        payload[`team${n}Name`] = teams[i].player?.name ?? `Team ${n}`;
        payload[`team${n}PhotoURL`] = teams[i].player?.photoURL ?? "";
        payload[`team${n}Score`] = teams[i].score;
        payload[`team${n}Hidden`] = teams[i].hidden === true;
      }
      await setDoc(doc(db, "current_match", PBS_CUP_8_MATCH_ID), payload, { merge: true });
    } catch (error) {
      if ((error as { code?: string })?.code === "permission-denied") showLimitReachedModal();
      else console.error("Error saving match data:", error);
    }
  }, [user, raceTo, pbsCup8GameMode, pocketedBalls, playerUIScore1, playerUIScore2, barPlayer1, barPlayer2, teams, showLimitReachedModal]);

  useEffect(() => {
    if (loading) return;
    saveMatchData();
  }, [teams, raceTo, pbsCup8GameMode, pocketedBalls, playerUIScore1, playerUIScore2, barPlayer1, barPlayer2, loading, saveMatchData]);

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

  const handleBarPlayer1Select = useCallback(
    async (selected: Player) => {
      setBarPlayer1(selected);
      setShowBarPlayer1Modal(false);
      try {
        await setDoc(
          doc(db, "current_match", PBS_CUP_8_MATCH_ID),
          {
            barPlayer1Id: selected.id,
            barPlayer1Name: selected.name,
            barPlayer1PhotoURL: selected.photoURL || "",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
        else console.error("Error saving bar player 1:", e);
      }
    },
    [showLimitReachedModal]
  );

  const handleBarPlayer2Select = useCallback(
    async (selected: Player) => {
      setBarPlayer2(selected);
      setShowBarPlayer2Modal(false);
      try {
        await setDoc(
          doc(db, "current_match", PBS_CUP_8_MATCH_ID),
          {
            barPlayer2Id: selected.id,
            barPlayer2Name: selected.name,
            barPlayer2PhotoURL: selected.photoURL || "",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
        else console.error("Error saving bar player 2:", e);
      }
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

  const handleDeleteTeam = useCallback(
    async (index: number) => {
      const n = index + 1;
      setTeams((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], hidden: true };
        return next;
      });
      try {
        await setDoc(
          doc(db, "current_match", PBS_CUP_8_MATCH_ID),
          { [`team${n}Hidden`]: true, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (e) {
        if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
        else console.error("Error deleting team:", e);
      }
    },
    [showLimitReachedModal]
  );

  const handleResetTeamUI = useCallback(async () => {
    setTeams((prev) => prev.map((t) => ({ ...t, hidden: false })));
    try {
      const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      for (let n = 1; n <= 8; n++) payload[`team${n}Hidden`] = false;
      await setDoc(doc(db, "current_match", PBS_CUP_8_MATCH_ID), payload, { merge: true });
    } catch (e) {
      if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
      else console.error("Error resetting team UI:", e);
    }
  }, [showLimitReachedModal]);

  const handleSelectLogo = (logo: Logo) => {
    const url = logo.logoURL || "";
    setLogo1URL(url);
    setDoc(doc(db, "config", PBS_CUP_8_CONFIG_ID), { logo1URL: url }, { merge: true }).catch((e) => {
      if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
    });
  };

  useEffect(() => {
    if (loading || showWinnerModal) return;
    for (let i = 0; i < 8; i++) {
      if (teams[i].hidden) continue;
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
        return;
      }

      const key = e.key.toLowerCase();
      // Bottom Players UI score keys (same as live-match) — not bound to teams
      switch (key) {
        case "q":
          e.preventDefault();
          setPlayerUIScore1((prev) => prev + 1);
          break;
        case "a":
          e.preventDefault();
          setPlayerUIScore1((prev) => Math.max(0, prev - 1));
          break;
        case "e":
          e.preventDefault();
          setPlayerUIScore2((prev) => prev + 1);
          break;
        case "d":
          e.preventDefault();
          setPlayerUIScore2((prev) => Math.max(0, prev - 1));
          break;
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

        <div className="absolute z-10 flex flex-col items-start space-y-2 overflow-visible" style={{ top: "160px", left: "30px" }}>
          {teams.map((slot, index) => {
            if (slot.hidden) return null;
            const teamBg = ["#1a1a2e", "#16213e", "#0f3460", "#b71c1c", "#1b5e20", "#2d1b4e", "#4a148c", "#1e3a5f"][index];
            const name = slot.player?.name ?? `Team ${index + 1}`;
            const photo = slot.player?.photoURL || null;
            const placeholder = getPlaceholder(slot.player?.id);
            return (
              <div key={index} className="flex items-center gap-0 overflow-visible">
                <div
                  className="relative px-2 py-1 flex items-center justify-between space-x-2 overflow-visible text-white"
                  style={{ minWidth: "247.5px", backgroundColor: teamBg }}
                >
                <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-visible">
                  <button
                    type="button"
                    onClick={() => canSelectPlayers && setShowTeamModalIndex(index)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 border-2 border-white flex items-center justify-center -my-1 ${
                      canSelectPlayers ? "cursor-pointer hover:opacity-80" : "cursor-default"
                    } ${!photo ? "bg-black/30" : ""}`}
                  >
                    {photo ? (
                      <Image key={slot.player?.id ?? `empty-${index}`} src={photo} alt={name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <Image key={slot.player?.id ?? `empty-${index}`} src={placeholder} alt={name} width={56} height={56} className="w-full h-full object-cover" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => canSelectPlayers && setShowTeamModalIndex(index)}
                    className={`flex-1 min-w-0 text-left font-bold truncate ${canSelectPlayers ? "hover:opacity-80" : ""}`}
                    style={{ fontSize: "22.5px" }}
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
                <div className="font-bold shrink-0" style={{ fontSize: "27.5px", color: "#FFD700" }}>
                  {slot.score}
                </div>
                </div>
                {canSelectPlayers && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteTeam(index);
                    }}
                    className="p-1.5 text-white opacity-40 hover:opacity-100 transition-opacity rounded shrink-0 cursor-pointer"
                    title="Clear this team slot"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          <div className="bg-black px-4 py-2 text-white flex items-center space-x-2" style={{ minWidth: "247.5px" }}>
            <div className="text-lg sm:text-xl font-bold">Race to</div>
            <div className="text-lg sm:text-xl font-bold">5</div>
            {user && (
              <button
                type="button"
                onClick={handleResetTeamUI}
                className="text-xs px-1.5 py-0.5 rounded border border-white/50 hover:bg-white/20 shrink-0"
                title="Show all team rows again"
              >
                Reset
              </button>
            )}
          </div>
        </div>

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

        {/* Bottom bar: two selectable players (barPlayer1/barPlayer2), not bound to 8 teams. Keyboard: Q/A, E/D */}
        <div className="mt-auto w-full md:w-[70%] max-w-full mx-auto flex items-center justify-center px-2 sm:px-4 md:px-0 overflow-visible">
          <div className="bg-indigo-900 flex items-center h-12 sm:h-14 md:h-16 flex-1 min-w-0 overflow-visible">
            <button
              type="button"
              onClick={() => canSelectPlayers && setShowBarPlayer1Modal(true)}
              className={`w-20 h-20 sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px] lg:w-[140px] lg:h-[140px] rounded-full overflow-hidden shrink-0 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white transition-all duration-300 ${canSelectPlayers ? "cursor-pointer hover:opacity-80" : "cursor-default"} ${barPlayer1?.photoURL ? "bg-transparent" : "bg-indigo-800"}`}
            >
              {barPlayer1?.photoURL ? (
                <Image src={barPlayer1.photoURL} alt={barPlayer1.name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
              ) : (
                <Image src={getPlaceholder(barPlayer1?.id)} alt={barPlayer1?.name ?? "Player 1"} width={56} height={56} className="w-full h-full object-cover" />
              )}
            </button>
            <button
              type="button"
              onClick={() => canSelectPlayers && setShowBarPlayer1Modal(true)}
              className={`flex-1 min-w-0 h-full flex items-center justify-center px-2 ${canSelectPlayers ? "cursor-pointer hover:bg-indigo-800" : "cursor-default"} transition-colors`}
            >
              <div className="text-sm sm:text-xl md:text-2xl lg:text-[38px] xl:text-[44px] font-bold text-white truncate text-center w-full">
                {barPlayer1?.name ?? "Player 1"}
              </div>
            </button>
            <div className="text-base sm:text-xl md:text-3xl font-bold text-white shrink-0 mx-1 sm:mx-1.5 md:mx-2 min-w-[2ch] text-center">
              {playerUIScore1}
            </div>
          </div>

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

          <div className="bg-indigo-800 flex items-center h-12 sm:h-14 md:h-16 flex-1 min-w-0 overflow-visible">
            <div className="text-base sm:text-xl md:text-3xl font-bold text-white shrink-0 mx-1 sm:mx-1.5 md:mx-2 min-w-[2ch] text-center">
              {playerUIScore2}
            </div>
            <button
              type="button"
              onClick={() => canSelectPlayers && setShowBarPlayer2Modal(true)}
              className={`flex-1 min-w-0 h-full flex items-center justify-center px-2 ${canSelectPlayers ? "cursor-pointer hover:bg-indigo-700" : "cursor-default"} transition-colors`}
            >
              <div className="text-sm sm:text-xl md:text-2xl lg:text-[38px] xl:text-[44px] font-bold text-white truncate text-center w-full">
                {barPlayer2?.name ?? "Player 2"}
              </div>
            </button>
            <button
              type="button"
              onClick={() => canSelectPlayers && setShowBarPlayer2Modal(true)}
              className={`w-20 h-20 sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px] lg:w-[140px] lg:h-[140px] rounded-full overflow-hidden shrink-0 flex items-center justify-center mx-1 sm:mx-1.5 md:mx-2 border-2 border-white transition-all duration-300 ${canSelectPlayers ? "cursor-pointer hover:opacity-80" : "cursor-default"} ${barPlayer2?.photoURL ? "bg-transparent" : "bg-indigo-700"}`}
            >
              {barPlayer2?.photoURL ? (
                <Image src={barPlayer2.photoURL} alt={barPlayer2.name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
              ) : (
                <Image src={getPlaceholder(barPlayer2?.id)} alt={barPlayer2?.name ?? "Player 2"} width={56} height={56} className="w-full h-full object-cover" />
              )}
            </button>
          </div>
        </div>

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

        {showBarPlayer1Modal && (
          <PlayerSelectionModal
            isOpen={true}
            onClose={() => setShowBarPlayer1Modal(false)}
            players={players}
            selectedPlayerId={barPlayer1?.id ?? null}
            onSelect={handleBarPlayer1Select}
            title="Select bottom bar – Player 1"
          />
        )}
        {showBarPlayer2Modal && (
          <PlayerSelectionModal
            isOpen={true}
            onClose={() => setShowBarPlayer2Modal(false)}
            players={players}
            selectedPlayerId={barPlayer2?.id ?? null}
            onSelect={handleBarPlayer2Select}
            title="Select bottom bar – Player 2"
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
