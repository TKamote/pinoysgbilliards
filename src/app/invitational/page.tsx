"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import TournamentWinnerModal from "@/components/TournamentWinnerModal";

export type InvitationalTab = "8-double" | "8-single" | "4-double" | "4-single";
const TABS: { id: InvitationalTab; label: string }[] = [
  { id: "8-double", label: "8 Double" },
  { id: "8-single", label: "8 Single" },
  { id: "4-double", label: "4 Double" },
  { id: "4-single", label: "4 Single" },
];
const DEFAULT_TAB: InvitationalTab = "8-double";
const TOUR_MANAGER_MATCH_ID = "tour-manager";
const FOUR_DOUBLE_GRAND_FINAL_ID = "4-de-m6";

// Types
interface Player {
  id: string;
  name: string;
  points: number;
  photoURL?: string;
}

interface Match {
  id: string;
  matchNumber: string;
  player1?: Player;
  player2?: Player;
  score1: number;
  score2: number;
  raceTo: number;
  winner?: "player1" | "player2";
  status: "pending" | "in_progress" | "completed";
  round: string;
  bracket: "winners" | "losers";
}

type Slot = "player1" | "player2";

// 8-player double elimination: 15 matches (format prefix 8-de- for Option B independence)
const MATCH_IDS_8_DE = ["8-de-m1", "8-de-m2", "8-de-m3", "8-de-m4", "8-de-m5", "8-de-m6", "8-de-m7", "8-de-m8", "8-de-m9", "8-de-m10", "8-de-m11", "8-de-m12", "8-de-m13", "8-de-m14", "8-de-m15"] as const;

const ADVANCEMENT_8_DE: Record<
  string,
  { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }
> = {
  "8-de-m1": { winner: { nextId: "8-de-m5", slot: "player1" }, loser: { nextId: "8-de-m8", slot: "player1" } },
  "8-de-m2": { winner: { nextId: "8-de-m5", slot: "player2" }, loser: { nextId: "8-de-m8", slot: "player2" } },
  "8-de-m3": { winner: { nextId: "8-de-m6", slot: "player1" }, loser: { nextId: "8-de-m9", slot: "player1" } },
  "8-de-m4": { winner: { nextId: "8-de-m6", slot: "player2" }, loser: { nextId: "8-de-m9", slot: "player2" } },
  "8-de-m5": { winner: { nextId: "8-de-m7", slot: "player1" }, loser: { nextId: "8-de-m10", slot: "player1" } },
  "8-de-m6": { winner: { nextId: "8-de-m7", slot: "player2" }, loser: { nextId: "8-de-m11", slot: "player1" } },
  "8-de-m7": { winner: { nextId: "8-de-m14", slot: "player1" }, loser: { nextId: "8-de-m13", slot: "player1" } },
  "8-de-m8": { winner: { nextId: "8-de-m10", slot: "player2" } },
  "8-de-m9": { winner: { nextId: "8-de-m11", slot: "player2" } },
  "8-de-m10": { winner: { nextId: "8-de-m12", slot: "player1" } },
  "8-de-m11": { winner: { nextId: "8-de-m12", slot: "player2" } },
  "8-de-m12": { winner: { nextId: "8-de-m13", slot: "player2" } },
  "8-de-m13": { winner: { nextId: "8-de-m14", slot: "player2" } },
  "8-de-m15": {},
};

const ROUND_LABEL_8_DE: Record<string, string> = {
  "8-de-m1": "WB R1", "8-de-m2": "WB R1", "8-de-m3": "WB R1", "8-de-m4": "WB R1",
  "8-de-m5": "WB R2", "8-de-m6": "WB R2", "8-de-m7": "WB Final",
  "8-de-m8": "LB R1", "8-de-m9": "LB R1", "8-de-m10": "LB R2", "8-de-m11": "LB R2",
  "8-de-m12": "LB R3", "8-de-m13": "LB Final", "8-de-m14": "Grand Final", "8-de-m15": "Bracket Reset",
};

// 8-player single elimination: 7 matches (R1 → Semis → Final)
const MATCH_IDS_8_SE = ["8-se-m1", "8-se-m2", "8-se-m3", "8-se-m4", "8-se-m5", "8-se-m6", "8-se-m7"] as const;
const ADVANCEMENT_8_SE: Record<string, { winner?: { nextId: string; slot: Slot } }> = {
  "8-se-m1": { winner: { nextId: "8-se-m5", slot: "player1" } },
  "8-se-m2": { winner: { nextId: "8-se-m5", slot: "player2" } },
  "8-se-m3": { winner: { nextId: "8-se-m6", slot: "player1" } },
  "8-se-m4": { winner: { nextId: "8-se-m6", slot: "player2" } },
  "8-se-m5": { winner: { nextId: "8-se-m7", slot: "player1" } },
  "8-se-m6": { winner: { nextId: "8-se-m7", slot: "player2" } },
  "8-se-m7": {},
};
const ROUND_LABEL_8_SE: Record<string, string> = {
  "8-se-m1": "R1", "8-se-m2": "R1", "8-se-m3": "R1", "8-se-m4": "R1",
  "8-se-m5": "Semis", "8-se-m6": "Semis", "8-se-m7": "Final",
};

// 4-player double elimination: 7 matches (WB R1, WB Final, LB R1, LB Final, GF, Bracket Reset)
const MATCH_IDS_4_DE = ["4-de-m1", "4-de-m2", "4-de-m3", "4-de-m4", "4-de-m5", "4-de-m6", "4-de-m7"] as const;
const ADVANCEMENT_4_DE: Record<
  string,
  { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }
> = {
  "4-de-m1": { winner: { nextId: "4-de-m3", slot: "player1" }, loser: { nextId: "4-de-m4", slot: "player1" } },
  "4-de-m2": { winner: { nextId: "4-de-m3", slot: "player2" }, loser: { nextId: "4-de-m4", slot: "player2" } },
  "4-de-m3": { winner: { nextId: "4-de-m6", slot: "player1" }, loser: { nextId: "4-de-m5", slot: "player1" } },
  "4-de-m4": { winner: { nextId: "4-de-m5", slot: "player2" } },
  "4-de-m5": { winner: { nextId: "4-de-m6", slot: "player2" } },
  "4-de-m6": {}, // Champion or bracket reset m7 filled in code
  "4-de-m7": {},
};
const ROUND_LABEL_4_DE: Record<string, string> = {
  "4-de-m1": "WB R1", "4-de-m2": "WB R1", "4-de-m3": "WB Final",
  "4-de-m4": "LB R1", "4-de-m5": "LB Final", "4-de-m6": "Grand Final", "4-de-m7": "Bracket Reset",
};

// 4-player single elimination: 3 matches (Semis → Final)
const MATCH_IDS_4_SE = ["4-se-m1", "4-se-m2", "4-se-m3"] as const;
const ADVANCEMENT_4_SE: Record<string, { winner?: { nextId: string; slot: Slot } }> = {
  "4-se-m1": { winner: { nextId: "4-se-m3", slot: "player1" } },
  "4-se-m2": { winner: { nextId: "4-se-m3", slot: "player2" } },
  "4-se-m3": {},
};
const ROUND_LABEL_4_SE: Record<string, string> = {
  "4-se-m1": "Semis", "4-se-m2": "Semis", "4-se-m3": "Final",
};

const InvitationalPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isManager, loading: authLoading } = useAuth();

  const activeTab = useMemo((): InvitationalTab => {
    const t = searchParams.get("tab");
    if (t === "8-double" || t === "8-single" || t === "4-double" || t === "4-single") return t;
    return DEFAULT_TAB;
  }, [searchParams]);

  const setActiveTab = useCallback(
    (tab: InvitationalTab) => {
      router.replace("/invitational?tab=" + tab);
    },
    [router]
  );

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("");
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("");
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [raceTo, setRaceTo] = useState<number>(9);
  // Winner confirmation: when increment would reach raceTo and win, show popup before applying
  const [showWinnerConfirm, setShowWinnerConfirm] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<"player1" | "player2" | null>(null);
  // Reset tournament confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Tournament winner modal (champion + receipt)
  const [showTournamentWinnerModal, setShowTournamentWinnerModal] = useState(false);

  const getMatchIdsForTab = useCallback((tab: InvitationalTab): readonly string[] => {
    if (tab === "8-double") return MATCH_IDS_8_DE;
    if (tab === "8-single") return MATCH_IDS_8_SE;
    if (tab === "4-double") return MATCH_IDS_4_DE;
    if (tab === "4-single") return MATCH_IDS_4_SE;
    return [];
  }, []);

  const getRoundLabel = useCallback((tab: InvitationalTab, id: string): string => {
    if (tab === "8-double") return ROUND_LABEL_8_DE[id] ?? "—";
    if (tab === "8-single") return ROUND_LABEL_8_SE[id] ?? "—";
    if (tab === "4-double") return ROUND_LABEL_4_DE[id] ?? "—";
    if (tab === "4-single") return ROUND_LABEL_4_SE[id] ?? "—";
    return "—";
  }, []);

  const getBracketForTab = useCallback((tab: InvitationalTab, id: string): "winners" | "losers" => {
    if (tab === "8-double") return (MATCH_IDS_8_DE.indexOf(id as (typeof MATCH_IDS_8_DE)[number]) < 7) ? "winners" : "losers";
    if (tab === "8-single") return "winners";
    if (tab === "4-double") return (["4-de-m1", "4-de-m2", "4-de-m3"].includes(id)) ? "winners" : "losers";
    if (tab === "4-single") return "winners";
    return "winners";
  }, []);

  const initializeMatches = useCallback(
    async (tab: InvitationalTab) => {
      const ids = getMatchIdsForTab(tab);
      if (ids.length === 0) return;
      console.log(`Initializing ${tab} matches (${ids.length})...`);
      const allMatches: Match[] = ids.map((id, i) => ({
        id,
        matchNumber: `M${i + 1}`,
        score1: 0,
        score2: 0,
        raceTo: 9,
        status: "pending" as const,
        round: getRoundLabel(tab, id),
        bracket: getBracketForTab(tab, id),
      }));
      setMatches(allMatches);
      try {
        const matchesRef = collection(db, "matches");
        for (const match of allMatches) {
          await setDoc(doc(matchesRef, match.id), match);
        }
        console.log(`${tab} matches saved to Firebase.`);
      } catch (error) {
        console.error("Error saving matches to Firebase:", error);
      }
    },
    [getMatchIdsForTab, getRoundLabel, getBracketForTab]
  );

  // Load players and matches from Firebase
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    console.log("useEffect triggered - loading data...");
    console.log("Is Manager:", isManager);
    const loadData = async () => {
      try {
        console.log("Loading players from Firebase...");
        // Load players
        const playersSnapshot = await getDocs(collection(db, "players"));
        const playersData = playersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Player[];
        console.log("Loaded players:", playersData.length);
        setPlayers(playersData);

        // Check if matches exist in Firebase
        console.log("Checking for existing matches in Firebase...");
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        const raw = matchesSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Match[];

        const ids = getMatchIdsForTab(activeTab);
        if (ids.length > 0) {
          const normalized: Match[] = ids.map((id, i) => {
            const existing = raw.find((m) => m.id === id);
            if (existing) return existing;
            return {
              id,
              matchNumber: `M${i + 1}`,
              score1: 0,
              score2: 0,
              raceTo: 9,
              status: "pending" as const,
              round: getRoundLabel(activeTab, id),
              bracket: getBracketForTab(activeTab, id),
            };
          });
          const hasAny = raw.some((m) => ids.includes(m.id));
          if (!hasAny && isManager) {
            console.log(`No ${activeTab} matches, initializing...`);
            await initializeMatches(activeTab);
          } else {
            setMatches(normalized);
          }
        } else {
          setMatches([]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        console.error("Full error details:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [initializeMatches, isManager, authLoading, activeTab, getMatchIdsForTab, getRoundLabel, getBracketForTab]);

  useEffect(() => {
    if (authLoading || loading) return;

    const checkAndInitialize = async () => {
      if (!isManager) return;
      const ids = getMatchIdsForTab(activeTab);
      if (ids.length === 0) return;
      try {
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        const hasAny = matchesSnapshot.docs.some((d) => ids.includes(d.id));
        if (!hasAny && matches.length === 0 && players.length > 0) {
          console.log(`Manager logged in, initializing ${activeTab} now...`);
          await initializeMatches(activeTab);
        }
      } catch (error) {
        console.error("Error checking matches after login:", error);
      }
    };

    checkAndInitialize();
  }, [isManager, authLoading, loading, activeTab, matches.length, players.length, initializeMatches, getMatchIdsForTab]);

  // Handle match click
  const handleMatchClick = (matchId: string) => {
    if (!isManager) {
      alert("Please log in as a manager to edit matches.");
      return;
    }
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
      setSelectedPlayer1(match.player1?.id || "");
      setSelectedPlayer2(match.player2?.id || "");
      setScore1(match.score1);
      setScore2(match.score2);
      setRaceTo(match.raceTo);
      setShowWinnerConfirm(false);
      setPendingWinner(null);
      setIsModalOpen(true);
    }
  };

  // Get match by ID
  const getMatchById = (matchId: string) => {
    return matches.find((m) => m.id === matchId);
  };

  // Sync 4 Double Grand Final (4-de-m6) to Tour Manager overlay (allows missing players)
  const syncM6ToTourManager = async (m6: Match | undefined) => {
    try {
      await setDoc(
        doc(db, "current_match", TOUR_MANAGER_MATCH_ID),
        {
          player1Id: m6?.player1?.id ?? "",
          player2Id: m6?.player2?.id ?? "",
          player1Name: m6?.player1?.name ?? "TBD",
          player2Name: m6?.player2?.name ?? "TBD",
          player1PhotoURL: m6?.player1?.photoURL ?? "",
          player2PhotoURL: m6?.player2?.photoURL ?? "",
          player1Score: m6?.score1 ?? 0,
          player2Score: m6?.score2 ?? 0,
          raceTo: m6?.raceTo ?? 9,
          currentTurn: null,
          pocketedBalls: [],
          gameMode: "9-ball",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error syncing Tour Manager:", e);
      throw e;
    }
  };

  const handleUpdateTourManager = async () => {
    if (activeTab !== "4-double") return;
    const m6 = matches.find((m) => m.id === FOUR_DOUBLE_GRAND_FINAL_ID);
    try {
      await syncM6ToTourManager(m6);
      alert("Tour Manager updated with Grand Final match.");
    } catch {
      alert("Failed to update Tour Manager. Check console.");
    }
  };

  // Score increment: cap at raceTo; if this point would win, show confirmation first
  const handleIncrementScore1 = () => {
    if (score1 >= raceTo) return;
    const next = score1 + 1;
    if (next === raceTo && next > score2) {
      setPendingWinner("player1");
      setShowWinnerConfirm(true);
      return;
    }
    setScore1(next);
  };
  const handleIncrementScore2 = () => {
    if (score2 >= raceTo) return;
    const next = score2 + 1;
    if (next === raceTo && next > score1) {
      setPendingWinner("player2");
      setShowWinnerConfirm(true);
      return;
    }
    setScore2(next);
  };
  const handleDecrementScore1 = () => {
    setScore1(Math.max(0, score1 - 1));
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };
  const handleDecrementScore2 = () => {
    setScore2(Math.max(0, score2 - 1));
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };
  const confirmWinner = () => {
    if (pendingWinner === "player1") setScore1(raceTo);
    if (pendingWinner === "player2") setScore2(raceTo);
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };
  const cancelWinnerConfirm = () => {
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };

  const renderMatchBox = (matchId: string, isLosers: boolean) => {
    const match = getMatchById(matchId);
    const hover = isLosers ? "hover:border-red-500" : "hover:border-blue-500";
    return (
      <div
        key={matchId}
        className={`w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer ${hover} hover:shadow-md transition-all`}
        onClick={() => handleMatchClick(matchId)}
      >
        <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
          <div className="flex items-center justify-center border-r border-gray-400">
            <div className="text-sm text-gray-700 font-medium">{match?.matchNumber ?? matchId}</div>
          </div>
          <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
            <div
              className={`text-base text-center border-b border-gray-400 pb-1 font-medium ${
                match?.winner === "player1" ? "text-yellow-600 font-bold" : "text-gray-800"
              }`}
            >
              {match?.player1?.name ?? "TBD"}
            </div>
            <div
              className={`text-base text-center pt-1 font-medium ${
                match?.winner === "player2" ? "text-yellow-600 font-bold" : "text-gray-800"
              }`}
            >
              {match?.player2?.name ?? "TBD"}
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-0">
            <div
              className={`text-base font-bold text-center border-b border-gray-400 pb-1 ${
                match?.winner === "player1" ? "text-yellow-600" : "text-gray-800"
              }`}
            >
              {match?.score1 ?? "-"}
            </div>
            <div
              className={`text-base font-bold text-center pt-1 ${
                match?.winner === "player2" ? "text-yellow-600" : "text-gray-800"
              }`}
            >
              {match?.score2 ?? "-"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Save match data
  const handleSaveMatch = async () => {
    if (!selectedMatch) return;

    if (!isManager) {
      alert("Only managers can update matches. Please log in.");
      return;
    }

    const player1 = players.find((p) => p.id === selectedPlayer1);
    const player2 = players.find((p) => p.id === selectedPlayer2);

    // Determine winner based on race to target
    let winner: "player1" | "player2" | undefined = undefined;
    let isCompleted = false;

    if (player1 && player2) {
      if (score1 >= raceTo && score1 > score2) {
        winner = "player1";
        isCompleted = true;
      } else if (score2 >= raceTo && score2 > score1) {
        winner = "player2";
        isCompleted = true;
      }
    }

    const updatedMatch: Match = {
      ...selectedMatch,
      player1: player1 || undefined,
      player2: player2 || undefined,
      score1: score1,
      score2: score2,
      raceTo: raceTo,
      winner: winner,
      status: isCompleted
        ? "completed"
        : player1 && player2
        ? "in_progress"
        : "pending",
    };

    let nextMatches = matches.map((match) =>
      match.id === selectedMatch.id ? updatedMatch : match
    );

    // Save current match to Firebase (merge so doc is created if missing)
    try {
      const matchRef = doc(db, "matches", selectedMatch.id);
      await setDoc(
        matchRef,
        {
          ...updatedMatch,
          player1: player1 ?? null,
          player2: player2 ?? null,
          winner: winner ?? null,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving match to Firebase:", error);
      setIsModalOpen(false);
      return;
    }

    const setNextMatchSlot = (matchId: string, slot: Slot, player: Player) => {
      const idx = nextMatches.findIndex((m) => m.id === matchId);
      if (idx === -1) return;
      const m = { ...nextMatches[idx] };
      if (slot === "player1") m.player1 = player;
      else m.player2 = player;
      nextMatches = nextMatches.slice(0, idx).concat(m, nextMatches.slice(idx + 1));
    };

    const persistMatches = async (updatedIds: Set<string>) => {
      for (const id of updatedIds) {
        const m = nextMatches.find((x) => x.id === id);
        if (m) {
          try {
            await updateDoc(doc(db, "matches", id), {
              player1: m.player1 ?? null,
              player2: m.player2 ?? null,
            });
          } catch (e) {
            console.error(`Error updating match ${id}:`, e);
          }
        }
      }
    };

    if (isCompleted && player1 && player2 && activeTab === "8-double") {
      const adv = ADVANCEMENT_8_DE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const loserPlayer = winner === "player1" ? player2 : player1;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
        updatedIds.add(adv.loser.nextId);
      }
      if (selectedMatch.id === "8-de-m14") {
        const m13 = nextMatches.find((m) => m.id === "8-de-m13");
        const lbChampion =
          m13?.winner && m13.player1 && m13.player2
            ? m13.winner === "player1" ? m13.player1 : m13.player2
            : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const m15Idx = nextMatches.findIndex((m) => m.id === "8-de-m15");
          if (m15Idx !== -1) {
            const m15 = { ...nextMatches[m15Idx], player1: updatedMatch.player1, player2: updatedMatch.player2 };
            nextMatches = nextMatches.slice(0, m15Idx).concat(m15, nextMatches.slice(m15Idx + 1));
            try {
              await updateDoc(doc(db, "matches", "8-de-m15"), {
                player1: updatedMatch.player1 ?? null,
                player2: updatedMatch.player2 ?? null,
              });
            } catch (e) {
              console.error("Error filling M15:", e);
            }
          }
        }
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "8-single") {
      const adv = ADVANCEMENT_8_SE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "4-double") {
      const adv = ADVANCEMENT_4_DE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const loserPlayer = winner === "player1" ? player2 : player1;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
        updatedIds.add(adv.loser.nextId);
      }
      if (selectedMatch.id === "4-de-m6") {
        const m5 = nextMatches.find((m) => m.id === "4-de-m5");
        const lbChampion = m5?.winner && m5.player1 && m5.player2
          ? (m5.winner === "player1" ? m5.player1 : m5.player2)
          : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const m7Idx = nextMatches.findIndex((m) => m.id === "4-de-m7");
          if (m7Idx !== -1) {
            const m7 = { ...nextMatches[m7Idx], player1: updatedMatch.player1, player2: updatedMatch.player2 };
            nextMatches = nextMatches.slice(0, m7Idx).concat(m7, nextMatches.slice(m7Idx + 1));
            try {
              await updateDoc(doc(db, "matches", "4-de-m7"), {
                player1: updatedMatch.player1 ?? null,
                player2: updatedMatch.player2 ?? null,
              });
            } catch (e) {
              console.error("Error filling 4-de-m7:", e);
            }
          }
        }
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "4-single") {
      const adv = ADVANCEMENT_4_SE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      await persistMatches(updatedIds);
    }

    setMatches(nextMatches);
    setIsModalOpen(false);
    // Auto-sync 4 Double Grand Final to Tour Manager whenever matches are saved (including advancement)
    if (activeTab === "4-double") {
      const m6 = nextMatches.find((m) => m.id === FOUR_DOUBLE_GRAND_FINAL_ID);
      syncM6ToTourManager(m6).catch((e) => console.error("Auto-sync Tour Manager:", e));
    }
    // If tournament just ended, show winner modal with receipt
    const champ = getTournamentChampion(nextMatches, activeTab);
    if (champ) setShowTournamentWinnerModal(true);
  };

  const handleResetTournament = async () => {
    if (!isManager) return;
    setShowResetConfirm(false);
    setShowTournamentWinnerModal(false);
    await initializeMatches(activeTab);
  };

  const getTournamentChampion = useCallback((matchList: Match[], tab: InvitationalTab): Player | null => {
    if (tab === "8-double") {
      const m14 = matchList.find((m) => m.id === "8-de-m14");
      const m15 = matchList.find((m) => m.id === "8-de-m15");
      if (m15?.status === "completed" && m15.winner && m15.player1 && m15.player2)
        return m15.winner === "player1" ? m15.player1 : m15.player2;
      if (m14?.status === "completed" && m14.winner && m14.player1 && m14.player2) {
        const m13 = matchList.find((m) => m.id === "8-de-m13");
        const lbChampion = m13?.winner && m13.player1 && m13.player2
          ? (m13.winner === "player1" ? m13.player1 : m13.player2)
          : null;
        const m14Winner = m14.winner === "player1" ? m14.player1 : m14.player2;
        if (lbChampion && m14Winner.id === lbChampion.id) return null;
        return m14Winner;
      }
      return null;
    }
    if (tab === "8-single") {
      const m7 = matchList.find((m) => m.id === "8-se-m7");
      if (m7?.status === "completed" && m7.winner && m7.player1 && m7.player2)
        return m7.winner === "player1" ? m7.player1 : m7.player2;
      return null;
    }
    if (tab === "4-double") {
      const m7 = matchList.find((m) => m.id === "4-de-m7");
      const m6 = matchList.find((m) => m.id === "4-de-m6");
      if (m7?.status === "completed" && m7.winner && m7.player1 && m7.player2)
        return m7.winner === "player1" ? m7.player1 : m7.player2;
      if (m6?.status === "completed" && m6.winner && m6.player1 && m6.player2) {
        const m5 = matchList.find((m) => m.id === "4-de-m5");
        const lbChampion = m5?.winner && m5.player1 && m5.player2
          ? (m5.winner === "player1" ? m5.player1 : m5.player2)
          : null;
        const m6Winner = m6.winner === "player1" ? m6.player1 : m6.player2;
        if (lbChampion && m6Winner.id === lbChampion.id) return null; // bracket reset needed
        return m6Winner;
      }
      return null;
    }
    if (tab === "4-single") {
      const m3 = matchList.find((m) => m.id === "4-se-m3");
      if (m3?.status === "completed" && m3.winner && m3.player1 && m3.player2)
        return m3.winner === "player1" ? m3.player1 : m3.player2;
      return null;
    }
    return null;
  }, []);

  const tournamentChampion = getTournamentChampion(matches, activeTab);

  if (loading || authLoading) {
    return (
      <div className="p-3 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800">
            Loading tournament...
          </div>
        </div>
      </div>
    );
  }

  const formatLabel = activeTab === "8-double" ? "8-Player Double Elimination" : activeTab === "8-single" ? "8-Player Single Elimination" : activeTab === "4-double" ? "4-Player Double Elimination" : "4-Player Single Elimination";

  return (
    <div className="p-3 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Invitational</h1>
          <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-amber-950"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="text-sm text-gray-600">{formatLabel}</span>
          <div className="flex items-center gap-2">
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTournamentWinnerModal(true)}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400"
              >
                View results
              </button>
            )}
            {isManager && matches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Reset bracket
              </button>
            )}
          </div>
        </div>

        <TournamentWinnerModal
          isOpen={showTournamentWinnerModal}
          onClose={() => setShowTournamentWinnerModal(false)}
          champion={tournamentChampion}
          matches={matches}
          formatLabel={formatLabel}
        />

        {/* Reset confirmation modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <p className="text-gray-800 font-medium mb-1">Reset this bracket?</p>
              <p className="text-sm text-gray-600 mb-4">
                All matches for this format will be cleared. Other tabs are not affected.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 rounded-md border border-gray-300 bg-white py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetTournament}
                  className="flex-1 rounded-md bg-red-600 py-2 text-white font-medium hover:bg-red-700"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "8-double" && (
        <div className="flex flex-col space-y-2">
          {/* Winners Bracket: M1–M7 */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                WB
              </div>
              <h2 className="text-lg font-bold text-gray-900">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[300px]">
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8-de-m1", "8-de-m2", "8-de-m3", "8-de-m4"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">WB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8-de-m5", "8-de-m6"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8-de-m7", false)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 my-2" />

          {/* Losers Bracket: M8–M13 */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                LB
              </div>
              <h2 className="text-lg font-bold text-gray-900">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[300px]">
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8-de-m8", "8-de-m9"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8-de-m10", "8-de-m11"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB R3</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8-de-m12", true)}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8-de-m13", true)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 my-2" />

          {/* Grand Final (M14) + Bracket Reset (M15) */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                Finals
              </div>
              <h2 className="text-lg font-bold text-gray-900">Grand Final &amp; Bracket Reset</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("8-de-m14", false)}
                {renderMatchBox("8-de-m15", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 8 Single: R1 → Semis → Final */}
        {activeTab === "8-single" && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center mb-2">
            <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">SE</div>
            <h2 className="text-lg font-bold text-gray-900">8-Player Single Elimination</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[280px]">
              <div className="flex flex-col min-h-[200px]">
                <div className="text-center font-bold text-sm text-gray-800 mb-2">R1</div>
                <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                  {["8-se-m1", "8-se-m2", "8-se-m3", "8-se-m4"].map((id) => renderMatchBox(id, false))}
                </div>
              </div>
              <div className="flex flex-col min-h-[200px]">
                <div className="text-center font-bold text-sm text-gray-800 mb-2">Semis</div>
                <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                  {["8-se-m5", "8-se-m6"].map((id) => renderMatchBox(id, false))}
                </div>
              </div>
              <div className="flex flex-col min-h-[200px]">
                <div className="text-center font-bold text-sm text-gray-800 mb-2">Final</div>
                <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                  {renderMatchBox("8-se-m7", false)}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 4 Double: WB R1 → WB Final → LB R1 → LB Final → GF → Bracket Reset */}
        {activeTab === "4-double" && (
        <div className="flex flex-col space-y-2">
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
              <h2 className="text-lg font-bold text-gray-900">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1">
                    {["4-de-m1", "4-de-m2"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1">{renderMatchBox("4-de-m3", false)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
              <h2 className="text-lg font-bold text-gray-900">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1">{renderMatchBox("4-de-m4", true)}</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1">{renderMatchBox("4-de-m5", true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
              <h2 className="text-lg font-bold text-gray-900">Grand Final &amp; Bracket Reset</h2>
              {isManager && (
                <button
                  type="button"
                  onClick={handleUpdateTourManager}
                  className="bg-red-900 hover:bg-red-800 text-white font-semibold px-3 py-1.5 rounded-lg border-2 border-red-950 shadow-md transition-colors"
                  title="Push Grand Final (M6) to Tour Manager-4 overlay"
                >
                  Update Tour Manager
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("4-de-m6", false)}
                {renderMatchBox("4-de-m7", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 4 Single: Semis → Final */}
        {activeTab === "4-single" && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center mb-2">
            <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">SE</div>
            <h2 className="text-lg font-bold text-gray-900">4-Player Single Elimination</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-2 items-center">
              <div className="flex flex-col">
                <div className="text-center font-bold text-sm text-gray-800 mb-2">Semis</div>
                <div className="flex flex-col space-y-1">
                  {["4-se-m1", "4-se-m2"].map((id) => renderMatchBox(id, false))}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-center font-bold text-sm text-gray-800 mb-2">Final</div>
                <div className="flex flex-col space-y-1">{renderMatchBox("4-se-m3", false)}</div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Match Input Modal */}
      {isModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedMatch.matchNumber} - {selectedMatch.round}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-800 font-medium hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Player selection: editable only in first-round matches per format; after that show names read-only */}
              {(() => {
                const firstRoundIds: string[] =
                  activeTab === "8-double" ? ["8-de-m1", "8-de-m2", "8-de-m3", "8-de-m4"]
                  : activeTab === "8-single" ? ["8-se-m1", "8-se-m2", "8-se-m3", "8-se-m4"]
                  : activeTab === "4-double" ? ["4-de-m1", "4-de-m2"]
                  : activeTab === "4-single" ? ["4-se-m1", "4-se-m2"]
                  : [];
                const isFirstRound = selectedMatch && firstRoundIds.includes(selectedMatch.id);
                const name1 = players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1";
                const name2 = players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2";
                if (isFirstRound) {
                  return (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Player 1</label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          value={selectedPlayer1}
                          onChange={(e) => setSelectedPlayer1(e.target.value)}
                        >
                          <option value="">Select Player</option>
                          {players
                            .filter((p) => p.id !== selectedPlayer2)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Player 2</label>
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                          value={selectedPlayer2}
                          onChange={(e) => setSelectedPlayer2(e.target.value)}
                        >
                          <option value="">Select Player</option>
                          {players
                            .filter((p) => p.id !== selectedPlayer1)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                      </div>
                    </>
                  );
                }
                return (
                  <div className="flex gap-4 text-sm">
                    <div className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-800 font-medium">
                      {name1}
                    </div>
                    <div className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-800 font-medium">
                      {name2}
                    </div>
                  </div>
                );
              })()}

              {/* Race to X - preserved */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Race to X</label>
                <input
                  type="number"
                  min="1"
                  max="21"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  value={raceTo}
                  onChange={(e) => setRaceTo(parseInt(e.target.value) || 9)}
                />
              </div>

              {/* Scores: labels are advancing player names; same increment/decrement UI */}
              {(() => {
                const name1 = players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1";
                const name2 = players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2";
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{name1}</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDecrementScore1}
                          className="w-10 h-10 rounded-md border-2 border-gray-300 bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score1 <= 0}
                          aria-label={`Decrement ${name1}`}
                        >
                          −
                        </button>
                        <span className="min-w-[3rem] text-center text-lg font-bold text-gray-900">
                          {score1}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrementScore1}
                          className="w-10 h-10 rounded-md border-2 border-gray-300 bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score1 >= raceTo}
                          aria-label={`Increment ${name1}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{name2}</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDecrementScore2}
                          className="w-10 h-10 rounded-md border-2 border-gray-300 bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score2 <= 0}
                          aria-label={`Decrement ${name2}`}
                        >
                          −
                        </button>
                        <span className="min-w-[3rem] text-center text-lg font-bold text-gray-900">
                          {score2}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrementScore2}
                          className="w-10 h-10 rounded-md border-2 border-gray-300 bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score2 >= raceTo}
                          aria-label={`Increment ${name2}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Winner confirmation popup (inside modal) */}
              {showWinnerConfirm && pendingWinner && (
                <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-gray-800 mb-1">
                    Confirm winner
                  </p>
                  <p className="text-gray-700 mb-3">
                    {pendingWinner === "player1"
                      ? players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1"
                      : players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2"}{" "}
                    has reached race to {raceTo}. Confirm as winner?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelWinnerConfirm}
                      className="flex-1 py-2 px-3 rounded-md border border-gray-400 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmWinner}
                      className="flex-1 py-2 px-3 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700"
                    >
                      Confirm winner
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMatch}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function InvitationalPageWithSuspense() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <InvitationalPage />
    </Suspense>
  );
}
