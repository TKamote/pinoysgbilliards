import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TournamentWinnerModal from './TournamentWinnerModal';

export interface Player {
  id: string;
  name: string;
  points: number;
  photoURL?: string;
}

export interface Match {
  id: string;
  matchNumber: string;
  player1?: Player | null;
  player2?: Player | null;
  score1: number;
  score2: number;
  raceTo: number;
  winner?: 'player1' | 'player2';
  status: 'pending' | 'in_progress' | 'completed';
  round: string;
  bracket: 'winners' | 'losers';
}

interface TenPlayerBracketAProps {
  players: Player[];
  canEdit: boolean;
}

// Map match numbers to their next destinations
const advancementLogic: Record<string, { w?: string; l?: string; wSlot?: 'player1' | 'player2'; lSlot?: 'player1' | 'player2' }> = {
  // Winners Round 1
  '1': { w: '9', l: '13', wSlot: 'player1', lSlot: 'player1' },
  '2': { w: '9', l: '13', wSlot: 'player2', lSlot: 'player2' },
  '3': { w: '10', l: '14', wSlot: 'player1', lSlot: 'player1' },
  '4': { w: '10', l: '14', wSlot: 'player2', lSlot: 'player2' },
  '5': { w: '11', l: '15', wSlot: 'player1', lSlot: 'player1' },
  '6': { w: '11', l: '15', wSlot: 'player2', lSlot: 'player2' },
  '7': { w: '12', l: '16', wSlot: 'player1', lSlot: 'player1' },
  '8': { w: '12', l: '16', wSlot: 'player2', lSlot: 'player2' },
  // Winners Round 2
  '9': { w: '21', l: '20', wSlot: 'player1', lSlot: 'player1' },
  '10': { w: '21', l: '19', wSlot: 'player2', lSlot: 'player1' },
  '11': { w: '22', l: '18', wSlot: 'player1', lSlot: 'player1' },
  '12': { w: '22', l: '17', wSlot: 'player2', lSlot: 'player1' },
  // Losers Round 1 (W goes to LB R2)
  '13': { w: '17', wSlot: 'player2' },
  '14': { w: '18', wSlot: 'player2' },
  '15': { w: '19', wSlot: 'player2' },
  '16': { w: '20', wSlot: 'player2' },
  // Losers Round 2
  '17': { w: '23', wSlot: 'player1' },
  '18': { w: '23', wSlot: 'player2' },
  '19': { w: '24', wSlot: 'player1' },
  '20': { w: '24', wSlot: 'player2' },
  // Winners Round 3
  '21': { w: '27', l: '26', wSlot: 'player1', lSlot: 'player1' },
  '22': { w: '27', l: '25', wSlot: 'player2', lSlot: 'player1' },
  // Losers Round 3
  '23': { w: '25', wSlot: 'player2' },
  '24': { w: '26', wSlot: 'player2' },
  // Losers Round 4
  '25': { w: '28', wSlot: 'player1' },
  '26': { w: '28', wSlot: 'player2' },
  // Winners Final
  '27': { w: '30', l: '29', wSlot: 'player1', lSlot: 'player1' },
  // Losers Round 5
  '28': { w: '29', wSlot: 'player2' },
  // Losers Final
  '29': { w: '30', wSlot: 'player2' },
  // Grand Final
  '30': { w: '31', l: '31', lSlot: 'player1', wSlot: 'player2' }, // Only used if L wins
};

const isBye = (p?: Player | null) => p?.name?.toLowerCase() === 'bye' || p?.id === 'bye';

export default function TenPlayerBracketA({ players, canEdit }: TenPlayerBracketAProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'winners' | 'losers'>('winners');
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const getChampion = () => {
    const m30 = matches.find(m => m.matchNumber.replace(/\D/g, '') === '30');
    const m31 = matches.find(m => m.matchNumber.replace(/\D/g, '') === '31');
    if (m31?.status === 'completed' && m31.winner) {
      return m31.winner === 'player1' ? m31.player1 : m31.player2;
    }
    if (m30?.status === 'completed' && m30.winner === 'player1') {
      return m30.player1;
    }
    return null;
  };

  const champion = getChampion();

  useEffect(() => {
    const q = query(collection(db, 'matches'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMatches: Match[] = [];
      snapshot.forEach((doc) => {
        if (doc.id.startsWith('10de-a-')) {
          loadedMatches.push({ id: doc.id, ...doc.data() } as Match);
        }
      });
      setMatches(loadedMatches.sort((a, b) => parseInt(a.matchNumber.replace(/\D/g, '')) - parseInt(b.matchNumber.replace(/\D/g, ''))));
    });

    return () => unsubscribe();
  }, []);

  // Auto-progress byes
  useEffect(() => {
    if (!canEdit || matches.length === 0) return;

    matches.forEach(async (match) => {
      if (match.status === 'completed') return;

      const p1Bye = isBye(match.player1);
      const p2Bye = isBye(match.player2);

      if (p1Bye && p2Bye) {
        // Both are byes, mark completed and advance a bye
        await updateDoc(doc(db, 'matches', match.id), { status: 'completed', winner: 'player1', score1: 0, score2: 0 });
        const logic = advancementLogic[match.matchNumber.replace(/\D/g, '')];
        if (logic && logic.w) {
          await updateDoc(doc(db, 'matches', `10de-a-${logic.w}`), {
            [logic.wSlot!]: match.player1,
          });
        }
      } else if (p1Bye && match.player2) {
        // P1 is bye, P2 is a real player, auto advance P2
        await updateDoc(doc(db, 'matches', match.id), {
          status: 'completed',
          winner: 'player2',
          score1: 0,
          score2: match.raceTo,
        });

        const numStr = match.matchNumber.replace(/\D/g, '');
        const logic = advancementLogic[numStr];
        if (logic) {
          if (logic.w) await updateDoc(doc(db, 'matches', `10de-a-${logic.w}`), { [logic.wSlot!]: match.player2 });
          if (logic.l) await updateDoc(doc(db, 'matches', `10de-a-${logic.l}`), { [logic.lSlot!]: match.player1 });
        }
      } else if (p2Bye && match.player1) {
        // P2 is bye, P1 is a real player, auto advance P1
        await updateDoc(doc(db, 'matches', match.id), {
          status: 'completed',
          winner: 'player1',
          score1: match.raceTo,
          score2: 0,
        });

        const numStr = match.matchNumber.replace(/\D/g, '');
        const logic = advancementLogic[numStr];
        if (logic) {
          if (logic.w) await updateDoc(doc(db, 'matches', `10de-a-${logic.w}`), { [logic.wSlot!]: match.player1 });
          if (logic.l) await updateDoc(doc(db, 'matches', `10de-a-${logic.l}`), { [logic.lSlot!]: match.player2 });
        }
      }
    });
  }, [matches, canEdit]);

  const handleUpdateScore = async (matchId: string, score1: number, score2: number, raceTo: number) => {
    if (!canEdit) return;
    
    let status = 'in_progress';
    let winner = null;

    if (score1 >= raceTo) {
      status = 'completed';
      winner = 'player1';
    } else if (score2 >= raceTo) {
      status = 'completed';
      winner = 'player2';
    }

    await updateDoc(doc(db, 'matches', matchId), {
      score1,
      score2,
      status,
      winner: winner || null
    });

    if (winner) {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const winnerPlayer = winner === 'player1' ? match.player1 : match.player2;
      const loserPlayer = winner === 'player1' ? match.player2 : match.player1;

      // Handle Grand Final Reset
      const numStr = match.matchNumber.replace(/\D/g, '');
      if (numStr === '30') {
        const isLoserBracketWinner = winner === 'player2'; // Assuming player2 is from LB
        if (isLoserBracketWinner) {
          // Bracket reset
          await updateDoc(doc(db, 'matches', '10de-a-31'), {
            player1: loserPlayer,
            player2: winnerPlayer,
            status: 'pending'
          });
        }
        return;
      }

      const logic = advancementLogic[numStr];
      if (logic) {
        if (logic.w) {
          await updateDoc(doc(db, 'matches', `10de-a-${logic.w}`), {
            [logic.wSlot!]: winnerPlayer,
          });
        }
        if (logic.l) {
          await updateDoc(doc(db, 'matches', `10de-a-${logic.l}`), {
            [logic.lSlot!]: loserPlayer,
          });
        }
      }
    }
  };

  const renderMatch = (matchNumber: string) => {
    const match = matches.find(m => m.matchNumber.replace(/\D/g, '') === matchNumber);
    if (!match) return null;

    // Hide matches that are only byes
    if (isBye(match.player1) && isBye(match.player2)) {
      return <div className="w-64 h-24 m-2 opacity-0" key={matchNumber} />;
    }

    return (
      <div key={match.id} className="w-64 bg-slate-800 border border-slate-700 rounded-lg p-3 m-2 shadow-lg flex flex-col justify-between">
        <div className="text-xs text-slate-400 mb-2 font-semibold">Match {match.matchNumber.replace(/\D/g, '')}</div>
        
        {/* Player 1 */}
        <div className={`flex justify-between items-center p-1 rounded ${match.winner === 'player1' ? 'bg-slate-700 font-bold text-white' : 'text-slate-300'}`}>
          {canEdit && parseInt(match.matchNumber.replace(/\D/g, '')) <= 8 ? (
            <select
              className="bg-slate-900 border border-slate-600 rounded text-xs w-32 truncate"
              value={match.player1?.id || ''}
              onChange={async (e) => {
                const val = e.target.value;
                let p = null;
                if (val === 'bye') {
                  p = { id: 'bye', name: 'Bye', points: 0 };
                } else if (val) {
                  p = players.find(p => p.id === val) || null;
                }
                await updateDoc(doc(db, 'matches', match.id), { player1: p });
              }}
            >
              <option value="">Select Player</option>
              <option value="bye">Bye</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <span className="truncate pr-2 text-sm">{match.player1?.name || 'TBD'}</span>
          )}
          {canEdit ? (
            <input 
              type="number" 
              value={match.score1} 
              onChange={(e) => handleUpdateScore(match.id, parseInt(e.target.value) || 0, match.score2, match.raceTo)}
              className="w-10 bg-slate-900 border border-slate-600 rounded text-center text-sm"
              min="0"
            />
          ) : (
            <span className="text-sm">{match.score1}</span>
          )}
        </div>

        {/* Player 2 */}
        <div className={`flex justify-between items-center p-1 rounded mt-1 ${match.winner === 'player2' ? 'bg-slate-700 font-bold text-white' : 'text-slate-300'}`}>
          {canEdit && parseInt(match.matchNumber.replace(/\D/g, '')) <= 8 ? (
            <select
              className="bg-slate-900 border border-slate-600 rounded text-xs w-32 truncate"
              value={match.player2?.id || ''}
              onChange={async (e) => {
                const val = e.target.value;
                let p = null;
                if (val === 'bye') {
                  p = { id: 'bye', name: 'Bye', points: 0 };
                } else if (val) {
                  p = players.find(p => p.id === val) || null;
                }
                await updateDoc(doc(db, 'matches', match.id), { player2: p });
              }}
            >
              <option value="">Select Player</option>
              <option value="bye">Bye</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <span className="truncate pr-2 text-sm">{match.player2?.name || 'TBD'}</span>
          )}
          {canEdit ? (
            <input 
              type="number" 
              value={match.score2} 
              onChange={(e) => handleUpdateScore(match.id, match.score1, parseInt(e.target.value) || 0, match.raceTo)}
              className="w-10 bg-slate-900 border border-slate-600 rounded text-center text-sm"
              min="0"
            />
          ) : (
            <span className="text-sm">{match.score2}</span>
          )}
        </div>
      </div>
    );
  };

  const renderWinnersBracket = () => (
    <div className="flex space-x-8 p-4 min-w-max">
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 1</h3>
        {['1', '2', '3', '4', '5', '6', '7', '8'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 2</h3>
        {['9', '10', '11', '12'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 3</h3>
        {['21', '22'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Winners Final</h3>
        {['27'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Grand Final</h3>
        {['30', '31'].map(renderMatch)}
      </div>
    </div>
  );

  const renderLosersBracket = () => (
    <div className="flex space-x-8 p-4 min-w-max">
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 1</h3>
        {['13', '14', '15', '16'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 2</h3>
        {['17', '18', '19', '20'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 3</h3>
        {['23', '24'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 4</h3>
        {['25', '26'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Round 5</h3>
        {['28'].map(renderMatch)}
      </div>
      <div className="flex flex-col justify-around">
        <h3 className="text-center text-slate-400 mb-4">Losers Final</h3>
        {['29'].map(renderMatch)}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-800 bg-slate-950">
        <button
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'winners' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setActiveTab('winners')}
        >
          Winners Bracket
        </button>
        <button
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'losers' ? 'text-red-400 border-b-2 border-red-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
          onClick={() => setActiveTab('losers')}
        >
          Losers Bracket
        </button>
      </div>

      {/* Bracket View */}
      <div className="overflow-x-auto overflow-y-auto max-h-[800px] bg-slate-900/50 p-4">
        {activeTab === 'winners' ? renderWinnersBracket() : renderLosersBracket()}
      </div>

      {champion && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-center">
          <button
            onClick={() => setShowWinnerModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-colors"
          >
            View Tournament Results
          </button>
        </div>
      )}

      <TournamentWinnerModal
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        champion={champion || null}
        matches={matches as any}
        formatLabel="10P- Bracket A (Double Elimination)"
      />
    </div>
  );
}
