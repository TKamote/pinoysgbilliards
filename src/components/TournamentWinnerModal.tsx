"use client";

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
  status: string;
  round: string;
  bracket: string;
}

interface TournamentWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  champion: Player | null;
  matches: Match[];
  formatLabel?: string; // e.g. "8-Player Double Elimination"
}

export default function TournamentWinnerModal({
  isOpen,
  onClose,
  champion,
  matches,
  formatLabel = "8-Player Double Elimination",
}: TournamentWinnerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-amber-50/95 backdrop-blur rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border-2 border-amber-200">
        <div className="flex items-center justify-between p-4 border-b border-amber-200/80">
          <span className="text-lg font-bold text-amber-900">Results / Progress</span>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-800 hover:text-amber-950 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div
            className="tournament-receipt-print bg-[#fefce8] text-amber-950 rounded-xl p-5 border-2 border-amber-300/80 shadow-inner"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            <div className="text-center border-b-2 border-dashed border-amber-400 pb-3 mb-3">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-semibold">
                Pinoy SG Billiards
              </p>
              <p className="text-sm font-bold text-amber-900 mt-1">INVITATIONAL</p>
              <p className="text-xs text-amber-600 mt-0.5">{formatLabel}</p>
            </div>

            {/* Champion block: show name + 🏆 when champion, else TBD */}
            <div className="text-center mb-4 p-3 rounded-lg bg-amber-300/40 border-2 border-amber-500">
              <p className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-0.5">
                Champion
              </p>
              <p className="text-xl font-bold text-amber-950">
                {champion ? (
                  <> {champion.name} <span className="text-amber-600" aria-hidden="true">🏆</span> </>
                ) : (
                  <span className="text-amber-600 font-normal">TBD</span>
                )}
              </p>
            </div>

            {/* Match list */}
            <div className="border-t border-dashed border-amber-400 pt-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-2">
                All matchups
              </p>
              {matches.map((m) => {
                const p1 = m.player1?.name ?? "—";
                const p2 = m.player2?.name ?? "—";
                const s1 = m.score1 ?? 0;
                const s2 = m.score2 ?? 0;
                const round = m.round ?? "—";
                const winnerIs1 = m.winner === "player1";
                const winnerIs2 = m.winner === "player2";
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 py-1.5 text-xs border-b border-amber-200/60 last:border-0"
                  >
                    <span className="w-8 font-bold text-amber-700 shrink-0">{m.matchNumber}</span>
                    <span className="w-24 text-amber-600 shrink-0">{round}</span>
                    <span className={`flex-1 truncate ${winnerIs1 ? "font-bold text-amber-900" : "text-amber-800"}`}>
                      {p1}
                    </span>
                    <span className="w-10 text-center font-mono font-semibold shrink-0">
                      {s1}–{s2}
                    </span>
                    <span className={`flex-1 truncate text-right ${winnerIs2 ? "font-bold text-amber-900" : "text-amber-800"}`}>
                      {p2}
                    </span>
                    {(winnerIs1 || winnerIs2) && (
                      <span className="text-amber-600 shrink-0" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-2 border-t border-dashed border-amber-400 text-center text-[10px] text-amber-600">
              Thank you for playing
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
