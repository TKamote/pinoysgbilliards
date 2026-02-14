"use client";

import { useState, useEffect, useCallback } from "react";
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

// 8-player double elimination: 15 matches (7 WB + 6 LB + Grand Final + Bracket Reset)
const INVITATIONAL_MATCH_IDS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12", "m13", "m14", "m15"] as const;
type Slot = "player1" | "player2";

const ADVANCEMENT: Record<
  string,
  { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }
> = {
  m1: { winner: { nextId: "m5", slot: "player1" }, loser: { nextId: "m8", slot: "player1" } },
  m2: { winner: { nextId: "m5", slot: "player2" }, loser: { nextId: "m8", slot: "player2" } },
  m3: { winner: { nextId: "m6", slot: "player1" }, loser: { nextId: "m9", slot: "player1" } },
  m4: { winner: { nextId: "m6", slot: "player2" }, loser: { nextId: "m9", slot: "player2" } },
  m5: { winner: { nextId: "m7", slot: "player1" }, loser: { nextId: "m10", slot: "player1" } },
  m6: { winner: { nextId: "m7", slot: "player2" }, loser: { nextId: "m11", slot: "player1" } },
  m7: { winner: { nextId: "m14", slot: "player1" }, loser: { nextId: "m13", slot: "player1" } },
  m8: { winner: { nextId: "m10", slot: "player2" } },
  m9: { winner: { nextId: "m11", slot: "player2" } },
  m10: { winner: { nextId: "m12", slot: "player1" } },
  m11: { winner: { nextId: "m12", slot: "player2" } },
  m12: { winner: { nextId: "m13", slot: "player2" } },
  m13: { winner: { nextId: "m14", slot: "player2" } },
  // m14: when LB champion wins we fill m15 with same two players (handled in handleSaveMatch)
  m15: {},
};

const ROUND_LABEL: Record<string, string> = {
  m1: "WB R1", m2: "WB R1", m3: "WB R1", m4: "WB R1",
  m5: "WB R2", m6: "WB R2", m7: "WB Final",
  m8: "LB R1", m9: "LB R1", m10: "LB R2", m11: "LB R2",
  m12: "LB R3", m13: "LB Final", m14: "Grand Final", m15: "Bracket Reset",
};

const InvitationalPage = () => {
  // Authentication
  const { isManager, loading: authLoading } = useAuth();

  // State management
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

  // Initialize 15 matches for 8-player double elimination (M1–M15)
  const initializeMatches = useCallback(async () => {
    console.log("Initializing Invitational matches (15)...");
    const allMatches: Match[] = INVITATIONAL_MATCH_IDS.map((id, i) => ({
      id,
      matchNumber: `M${i + 1}`,
      score1: 0,
      score2: 0,
      raceTo: 9,
      status: "pending" as const,
      round: ROUND_LABEL[id] ?? "—",
      bracket: i < 7 ? ("winners" as const) : ("losers" as const),
    }));
    // m15 is bracket reset: show in UI but no players until LB wins m14
    console.log("Created matches:", allMatches.length);
    setMatches(allMatches);

    try {
      const matchesRef = collection(db, "matches");
      for (const match of allMatches) {
        await setDoc(doc(matchesRef, match.id), match);
      }
      console.log("All Invitational matches saved to Firebase.");
    } catch (error) {
      console.error("Error saving matches to Firebase:", error);
    }
  }, []);

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
        if (matchesSnapshot.empty) {
          console.log("No matches found.");
          if (isManager) {
            console.log("Manager logged in, initializing matches...");
            await initializeMatches();
          } else {
            // Still seed 15 match slots so bracket renders and modal can open after login
            const defaults: Match[] = INVITATIONAL_MATCH_IDS.map((id, i) => ({
              id,
              matchNumber: `M${i + 1}`,
              score1: 0,
              score2: 0,
              raceTo: 9,
              status: "pending" as const,
              round: ROUND_LABEL[id] ?? "—",
              bracket: i < 7 ? ("winners" as const) : ("losers" as const),
            }));
            setMatches(defaults);
          }
        } else {
          console.log("Loading existing matches from Firebase...");
          const raw = matchesSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as Match[];
          // Normalize to exactly 15 Invitational matches (m1–m15) so bracket and modal always work
          const normalized: Match[] = INVITATIONAL_MATCH_IDS.map((id, i) => {
            const existing = raw.find((m) => m.id === id);
            if (existing) return existing;
            return {
              id,
              matchNumber: `M${i + 1}`,
              score1: 0,
              score2: 0,
              raceTo: 9,
              status: "pending" as const,
              round: ROUND_LABEL[id] ?? "—",
              bracket: i < 7 ? ("winners" as const) : ("losers" as const),
            };
          });
          console.log("Loaded matches:", normalized.length);
          setMatches(normalized);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        console.error("Full error details:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [initializeMatches, isManager, authLoading]);

  // Initialize matches when manager logs in (if matches don't exist)
  useEffect(() => {
    if (authLoading || loading) return;

    const checkAndInitialize = async () => {
      if (!isManager) return;

      try {
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        if (
          matchesSnapshot.empty &&
          matches.length === 0 &&
          players.length > 0
        ) {
          console.log("Manager logged in, initializing matches now...");
          await initializeMatches();
        }
      } catch (error) {
        console.error("Error checking matches after login:", error);
      }
    };

    checkAndInitialize();
  }, [
    isManager,
    authLoading,
    loading,
    matches.length,
    players.length,
    initializeMatches,
  ]);

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

    // Post-save: if completed, apply advancement and optionally fill M15
    if (isCompleted && player1 && player2) {
      const adv = ADVANCEMENT[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const loserPlayer = winner === "player1" ? player2 : player1;

      const setNextMatchSlot = (matchId: string, slot: Slot, player: Player) => {
        const idx = nextMatches.findIndex((m) => m.id === matchId);
        if (idx === -1) return;
        const m = { ...nextMatches[idx] };
        if (slot === "player1") m.player1 = player;
        else m.player2 = player;
        nextMatches = nextMatches.slice(0, idx).concat(m, nextMatches.slice(idx + 1));
      };

      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
      }

      // Grand Final: if LB champion won M14, fill M15 with same two players
      if (selectedMatch.id === "m14") {
        const m13 = nextMatches.find((m) => m.id === "m13");
        const lbChampion =
          m13?.winner && m13.player1 && m13.player2
            ? m13.winner === "player1"
              ? m13.player1
              : m13.player2
            : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const m15Idx = nextMatches.findIndex((m) => m.id === "m15");
          if (m15Idx !== -1) {
            const m15 = {
              ...nextMatches[m15Idx],
              player1: updatedMatch.player1,
              player2: updatedMatch.player2,
            };
            nextMatches = nextMatches.slice(0, m15Idx).concat(m15, nextMatches.slice(m15Idx + 1));
            try {
              await updateDoc(doc(db, "matches", "m15"), {
                player1: updatedMatch.player1 ?? null,
                player2: updatedMatch.player2 ?? null,
              });
            } catch (e) {
              console.error("Error filling M15:", e);
            }
          }
        }
      }

      // Persist advanced matches to Firebase
      const updatedIds = new Set<string>();
      if (adv?.winner) updatedIds.add(adv.winner.nextId);
      if (adv?.loser) updatedIds.add(adv.loser.nextId);
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
    }

    setMatches(nextMatches);
    setIsModalOpen(false);
    // If tournament just ended, show winner modal with receipt
    const champ = getTournamentChampion(nextMatches);
    if (champ) setShowTournamentWinnerModal(true);
  };

  const handleResetTournament = async () => {
    if (!isManager) return;
    setShowResetConfirm(false);
    setShowTournamentWinnerModal(false);
    await initializeMatches();
  };

  // Tournament champion: winner of M15, or winner of M14 if WB won (no bracket reset)
  const getTournamentChampion = useCallback((matchList: Match[]): Player | null => {
    const m14 = matchList.find((m) => m.id === "m14");
    const m15 = matchList.find((m) => m.id === "m15");
    if (m15?.status === "completed" && m15.winner && m15.player1 && m15.player2)
      return m15.winner === "player1" ? m15.player1 : m15.player2;
    if (m14?.status === "completed" && m14.winner && m14.player1 && m14.player2) {
      const m13 = matchList.find((m) => m.id === "m13");
      const lbChampion =
        m13?.winner && m13.player1 && m13.player2
          ? m13.winner === "player1"
            ? m13.player1
            : m13.player2
          : null;
      const m14Winner = m14.winner === "player1" ? m14.player1 : m14.player2;
      if (lbChampion && m14Winner.id === lbChampion.id) return null;
      return m14Winner;
    }
    return null;
  }, []);

  const tournamentChampion = getTournamentChampion(matches);

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

  return (
    <div className="p-3 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Invitational
          </h1>
          <div className="flex items-center gap-2">
            {tournamentChampion && (
              <button
                type="button"
                onClick={() => setShowTournamentWinnerModal(true)}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400"
              >
                View results
              </button>
            )}
            {isManager && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Reset tournament
              </button>
            )}
          </div>
        </div>

        <TournamentWinnerModal
          isOpen={showTournamentWinnerModal}
          onClose={() => setShowTournamentWinnerModal(false)}
          champion={tournamentChampion}
          matches={matches}
        />

        {/* Reset confirmation modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <p className="text-gray-800 font-medium mb-1">Reset tournament?</p>
              <p className="text-sm text-gray-600 mb-4">
                All 15 matches will be cleared. All players will be available to assign again in WB R1.
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

        {/* Main Container: 8-player double elimination (15 matches) */}
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
                    {["m1", "m2", "m3", "m4"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">WB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["m5", "m6"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("m7", false)}
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
                    {["m8", "m9"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["m10", "m11"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB R3</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("m12", true)}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("m13", true)}
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
                {renderMatchBox("m14", false)}
                {renderMatchBox("m15", false)}
              </div>
            </div>
          </div>
        </div>
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
              {/* Player selection: editable only in WB R1 (m1–m4); after that show names read-only */}
              {(() => {
                const isFirstRoundWb = selectedMatch && ["m1", "m2", "m3", "m4"].includes(selectedMatch.id);
                const name1 = players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1";
                const name2 = players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2";
                if (isFirstRoundWb) {
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

export default InvitationalPage;
