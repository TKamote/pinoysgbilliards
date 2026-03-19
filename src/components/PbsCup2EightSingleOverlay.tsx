"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  bracket: "winners";
}

type Slot = "player1" | "player2";

const MATCH_IDS_8_SE = [
  "pbs2-8se-m1",
  "pbs2-8se-m2",
  "pbs2-8se-m3",
  "pbs2-8se-m4",
  "pbs2-8se-m5",
  "pbs2-8se-m6",
  "pbs2-8se-m7",
] as const;

const ADVANCEMENT_8_SE: Record<string, { winner?: { nextId: string; slot: Slot } }> = {
  "pbs2-8se-m1": { winner: { nextId: "pbs2-8se-m5", slot: "player1" } },
  "pbs2-8se-m2": { winner: { nextId: "pbs2-8se-m5", slot: "player2" } },
  "pbs2-8se-m3": { winner: { nextId: "pbs2-8se-m6", slot: "player1" } },
  "pbs2-8se-m4": { winner: { nextId: "pbs2-8se-m6", slot: "player2" } },
  "pbs2-8se-m5": { winner: { nextId: "pbs2-8se-m7", slot: "player1" } },
  "pbs2-8se-m6": { winner: { nextId: "pbs2-8se-m7", slot: "player2" } },
  "pbs2-8se-m7": {},
};

const ROUND_LABEL_8_SE: Record<string, string> = {
  "pbs2-8se-m1": "R1",
  "pbs2-8se-m2": "R1",
  "pbs2-8se-m3": "R1",
  "pbs2-8se-m4": "R1",
  "pbs2-8se-m5": "Semis",
  "pbs2-8se-m6": "Semis",
  "pbs2-8se-m7": "Final",
};

const FIRST_ROUND_IDS = ["pbs2-8se-m1", "pbs2-8se-m2", "pbs2-8se-m3", "pbs2-8se-m4"];

interface Props {
  players: Player[];
  canEdit: boolean;
}

function defaultMatch(id: string, index: number): Match {
  return {
    id,
    matchNumber: `M${index + 1}`,
    score1: 0,
    score2: 0,
    raceTo: 5,
    status: "pending",
    round: ROUND_LABEL_8_SE[id] ?? "R1",
    bracket: "winners",
  };
}

export default function PbsCup2EightSingleOverlay({ players, canEdit }: Props) {
  // Breaker UI: allow the same player-selection modal UI used in R1
  // to be shown for Semis and Final as well.
  const isBreaker8SingleUI = true;

  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer1, setSelectedPlayer1] = useState("");
  const [selectedPlayer2, setSelectedPlayer2] = useState("");
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [raceTo, setRaceTo] = useState(5);
  const [playerSearch, setPlayerSearch] = useState("");
  const [showWinnerConfirm, setShowWinnerConfirm] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<"player1" | "player2" | null>(null);

  const getMatchById = (matchId: string) => matches.find((m) => m.id === matchId);

  useEffect(() => {
    const loadMatches = async () => {
      const loaded: Match[] = [];
      for (let i = 0; i < MATCH_IDS_8_SE.length; i += 1) {
        const id = MATCH_IDS_8_SE[i];
        const fallback = defaultMatch(id, i);
        const ref = doc(db, "matches", id);
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as Partial<Match>;
            loaded.push({
              ...fallback,
              ...data,
              id,
              player1: data.player1 ?? undefined,
              player2: data.player2 ?? undefined,
              winner: data.winner ?? undefined,
            });
          } else {
            loaded.push(fallback);
            await setDoc(ref, { ...fallback, player1: null, player2: null, winner: null }, { merge: true });
          }
        } catch (error) {
          console.error(`Error loading match ${id}:`, error);
          loaded.push(fallback);
        }
      }
      setMatches(loaded);
    };
    loadMatches();
  }, []);

  const handleMatchClick = (matchId: string) => {
    if (!canEdit) return;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    setSelectedMatch(match);
    setSelectedPlayer1(match.player1?.id ?? "");
    setSelectedPlayer2(match.player2?.id ?? "");
    setScore1(match.score1);
    setScore2(match.score2);
    setRaceTo(match.raceTo);
    setPlayerSearch("");
    setShowWinnerConfirm(false);
    setPendingWinner(null);
    setIsModalOpen(true);
  };

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

  const setNextMatchSlot = (
    list: Match[],
    nextId: string,
    slot: Slot,
    player: Player
  ): Match[] => {
    return list.map((m) => {
      if (m.id !== nextId) return m;
      const updated: Match = { ...m, [slot]: player, winner: undefined };
      if (slot === "player1" && !updated.player2) {
        updated.score1 = 0;
        updated.score2 = 0;
        updated.status = "pending";
      }
      if (slot === "player2" && !updated.player1) {
        updated.score1 = 0;
        updated.score2 = 0;
        updated.status = "pending";
      }
      return updated;
    });
  };

  const handleSaveMatch = async () => {
    if (!selectedMatch) return;
    const player1 = players.find((p) => p.id === selectedPlayer1);
    const player2 = players.find((p) => p.id === selectedPlayer2);

    let winner: "player1" | "player2" | undefined;
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
      player1: player1 ?? undefined,
      player2: player2 ?? undefined,
      score1,
      score2,
      raceTo,
      winner,
      status: isCompleted ? "completed" : player1 && player2 ? "in_progress" : "pending",
    };

    let nextMatches = matches.map((m) => (m.id === selectedMatch.id ? updatedMatch : m));
    const updatedRefs = new Set<string>([selectedMatch.id]);

    // PBS Cup 2 (8-player) - breaker mode:
    // Do NOT auto-advance winners into Semis/Final.
    // Saving a match should only update the selected match itself.

    setMatches(nextMatches);
    setIsModalOpen(false);

    try {
      for (const id of updatedRefs) {
        const m = nextMatches.find((row) => row.id === id);
        if (!m) continue;
        await setDoc(
          doc(db, "matches", id),
          { ...m, player1: m.player1 ?? null, player2: m.player2 ?? null, winner: m.winner ?? null },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("Error saving pbs cup 2 bracket match:", error);
    }
  };

  const filteredPlayers = useMemo(() => {
    const searchLower = playerSearch.trim().toLowerCase();
    const base = searchLower
      ? players.filter((p) => p.name.toLowerCase().includes(searchLower))
      : players;
    if (!selectedMatch || !FIRST_ROUND_IDS.includes(selectedMatch.id)) return base;

    const used = new Set<string>();
    for (const m of matches) {
      if (!FIRST_ROUND_IDS.includes(m.id) || m.id === selectedMatch.id) continue;
      if (m.player1?.id) used.add(m.player1.id);
      if (m.player2?.id) used.add(m.player2.id);
    }
    return base.filter((p) => !used.has(p.id));
  }, [matches, playerSearch, players, selectedMatch]);

  const renderMatchBox = (matchId: string) => {
    const match = getMatchById(matchId);
    const winner = match?.winner;
    const tone =
      matchId === "pbs2-8se-m7"
        ? {
            border: "border-amber-900",
            bg: "bg-amber-950/95",
            hover: "hover:border-amber-600",
            divider: "border-amber-700/70",
          }
        : matchId === "pbs2-8se-m5" || matchId === "pbs2-8se-m6"
        ? {
            border: "border-indigo-900",
            bg: "bg-indigo-950/95",
            hover: "hover:border-indigo-500",
            divider: "border-indigo-700/70",
          }
        : {
            border: "border-sky-900",
            bg: "bg-sky-950/95",
            hover: "hover:border-sky-500",
            divider: "border-sky-700/70",
          };

    return (
      <button
        key={matchId}
        type="button"
        className={`w-60 h-24 border-2 ${tone.border} ${tone.bg} rounded-lg px-3 py-0.5 ${tone.hover} hover:shadow-md transition-all text-left`}
        onClick={() => handleMatchClick(matchId)}
        disabled={!canEdit}
      >
        <div className="grid grid-cols-[1fr_3fr_1fr] gap-3 h-full">
          <div className={`flex items-center justify-center border-r ${tone.divider}`}>
            <div className="font-medium text-base text-slate-100">{match?.matchNumber ?? "M?"}</div>
          </div>
          <div className={`flex flex-col justify-center border-r ${tone.divider}`}>
            <div className={`text-center border-b ${tone.divider} pb-1 font-medium text-lg ${winner === "player1" ? "bg-emerald-700/80 text-slate-50 font-bold" : "text-slate-100"}`}>
              {match?.player1?.name ?? "TBD"}
            </div>
            <div className={`text-center pt-1 font-medium text-lg ${winner === "player2" ? "bg-emerald-700/80 text-slate-50 font-bold" : "text-slate-100"}`}>
              {match?.player2?.name ?? "TBD"}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className={`font-bold text-center border-b ${tone.divider} pb-1 text-lg ${winner === "player1" ? "bg-emerald-700/80 text-slate-50" : "text-slate-100"}`}>
              {match?.score1 ?? "-"}
            </div>
            <div className={`font-bold text-center pt-1 text-lg ${winner === "player2" ? "bg-emerald-700/80 text-slate-50" : "text-slate-100"}`}>
              {match?.score2 ?? "-"}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="w-full md:w-[75%] mx-auto mt-1 md:mt-2 rounded-lg border border-transparent bg-transparent p-4">
        <div className="flex items-center justify-center mb-3">
          <h2 className="text-3xl font-bold text-slate-900">PBS Cup March 2026</h2>
        </div>
        <div className="overflow-x-auto">
          <div className="flex w-max space-x-[4.5rem] mx-auto pb-3 items-start min-h-[420px]">
            <div className="flex flex-col min-h-[450px]">
              <div className="text-center font-bold text-xl text-slate-900 mb-3">R1</div>
              <div className="flex flex-col flex-1">
                <div className="flex-1 flex flex-col space-y-5 items-center justify-center">
                  {["pbs2-8se-m1", "pbs2-8se-m2"].map((id) => renderMatchBox(id))}
                </div>
                <div className="flex-1 flex flex-col space-y-5 items-center justify-center">
                  {["pbs2-8se-m3", "pbs2-8se-m4"].map((id) => renderMatchBox(id))}
                </div>
              </div>
            </div>
            <div className="flex flex-col min-h-[450px]">
              <div className="text-center font-bold text-xl text-slate-900 mb-3">Semis</div>
              <div className="flex flex-col flex-1 min-h-[450px]">
                <div className="flex-1 flex items-center justify-center">
                  {renderMatchBox("pbs2-8se-m5")}
                </div>
                <div className="flex-1 flex items-center justify-center">
                  {renderMatchBox("pbs2-8se-m6")}
                </div>
              </div>
            </div>
            <div className="flex flex-col min-h-[450px]">
              <div className="text-center font-bold text-xl text-slate-900 mb-3">Final</div>
              <div className="flex flex-col space-y-0 items-center justify-center flex-1 pt-0">
                {renderMatchBox("pbs2-8se-m7")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-96 max-w-md mx-4 border border-slate-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100">{selectedMatch.matchNumber} - {selectedMatch.round}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-300 font-medium hover:text-slate-100">✕</button>
            </div>

            <div className="space-y-4">
              {isBreaker8SingleUI || FIRST_ROUND_IDS.includes(selectedMatch.id) ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Search players</label>
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="w-full border border-slate-600 rounded-md px-3 py-1.5 text-slate-100 text-sm bg-slate-800"
                      placeholder="Type to filter names..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Player 1</label>
                    <select
                      className="w-full border border-slate-600 rounded-md px-3 py-2 text-slate-100 bg-slate-800"
                      value={selectedPlayer1}
                      onChange={(e) => setSelectedPlayer1(e.target.value)}
                    >
                      <option value="">Select Player</option>
                      {filteredPlayers.filter((p) => p.id !== selectedPlayer2).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Player 2</label>
                    <select
                      className="w-full border border-slate-600 rounded-md px-3 py-2 text-slate-100 bg-slate-800"
                      value={selectedPlayer2}
                      onChange={(e) => setSelectedPlayer2(e.target.value)}
                    >
                      <option value="">Select Player</option>
                      {filteredPlayers.filter((p) => p.id !== selectedPlayer1).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="flex gap-4 text-sm">
                  <div className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 font-medium">
                    {players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1"}
                  </div>
                  <div className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 font-medium">
                    {players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2"}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Race to X</label>
                <input
                  type="number"
                  min="1"
                  max="21"
                  className="w-full border border-slate-600 rounded-md px-3 py-2 text-slate-100 bg-slate-800"
                  value={raceTo}
                  onChange={(e) => setRaceTo(parseInt(e.target.value, 10) || 5)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    {players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleDecrementScore1} className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700" disabled={score1 <= 0}>-</button>
                    <span className="min-w-[3rem] text-center text-lg font-bold text-slate-100">{score1}</span>
                    <button type="button" onClick={handleIncrementScore1} className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700" disabled={score1 >= raceTo}>+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    {players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2"}
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleDecrementScore2} className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700" disabled={score2 <= 0}>-</button>
                    <span className="min-w-[3rem] text-center text-lg font-bold text-slate-100">{score2}</span>
                    <button type="button" onClick={handleIncrementScore2} className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700" disabled={score2 >= raceTo}>+</button>
                  </div>
                </div>
              </div>

              {showWinnerConfirm && pendingWinner && (
                <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-slate-100 mb-1">Confirm winner</p>
                  <p className="text-slate-300 mb-3">
                    {(pendingWinner === "player1"
                      ? players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1"
                      : players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2")} has reached race to {raceTo}. Confirm as winner?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowWinnerConfirm(false);
                        setPendingWinner(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-md border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingWinner === "player1") setScore1(raceTo);
                        if (pendingWinner === "player2") setScore2(raceTo);
                        setShowWinnerConfirm(false);
                        setPendingWinner(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700"
                    >
                      Confirm winner
                    </button>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 text-white py-2 px-4 rounded-md hover:bg-slate-600">Cancel</button>
                <button type="button" onClick={handleSaveMatch} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Save Match</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
