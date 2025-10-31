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

const MatchesPage = () => {
  // Authentication
  const { isManager, loading: authLoading } = useAuth();

  // Tournament state - can be managed by tournament manager
  const totalPlayers = 10; // Example: 8, 9, or 10 players
  const qualifyingMatches = totalPlayers > 8 ? totalPlayers - 8 : 0;

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

  // Generate match numbers based on structure
  const getMatchNumbers = () => {
    let matchCounter = 1;
    const matches = {
      qualifying: [] as string[],
      round1: [] as string[],
      round2: [] as string[],
      round3: [] as string[],
    };

    // Qualifying matches (if any)
    for (let i = 0; i < qualifyingMatches; i++) {
      matches.qualifying.push(`M${matchCounter++}`);
    }

    // Round 1 matches (always 4)
    for (let i = 0; i < 4; i++) {
      matches.round1.push(`M${matchCounter++}`);
    }

    // Round 2 matches (always 2)
    for (let i = 0; i < 2; i++) {
      matches.round2.push(`M${matchCounter++}`);
    }

    // Round 3 match (always 1)
    matches.round3.push(`M${matchCounter++}`);

    return matches;
  };

  const matchNumbers = getMatchNumbers();

  // Initialize all matches for the tournament
  const initializeMatches = useCallback(async () => {
    console.log("Initializing matches...");
    const allMatches: Match[] = [];
    let matchCounter = 1;

    // Winners Bracket matches
    // Qualifying matches
    for (let i = 0; i < qualifyingMatches; i++) {
      allMatches.push({
        id: `winners-qualifying-${i}`,
        matchNumber: `M${matchCounter++}`,
        score1: 0,
        score2: 0,
        raceTo: 9,
        status: "pending",
        round: "qualifying",
        bracket: "winners",
      });
    }

    // Round 1 matches
    for (let i = 0; i < 4; i++) {
      allMatches.push({
        id: `winners-round1-${i}`,
        matchNumber: `M${matchCounter++}`,
        score1: 0,
        score2: 0,
        raceTo: 9,
        status: "pending",
        round: "round1",
        bracket: "winners",
      });
    }

    // Round 2 matches
    for (let i = 0; i < 2; i++) {
      allMatches.push({
        id: `winners-round2-${i}`,
        matchNumber: `M${matchCounter++}`,
        score1: 0,
        score2: 0,
        raceTo: 9,
        status: "pending",
        round: "round2",
        bracket: "winners",
      });
    }

    // Round 3 match
    allMatches.push({
      id: "winners-round3-0",
      matchNumber: `M${matchCounter++}`,
      score1: 0,
      score2: 0,
      raceTo: 9,
      status: "pending",
      round: "round3",
      bracket: "winners",
    });

    // Losers Bracket matches
    // Losers qualifying
    allMatches.push({
      id: "losers-qualifying-0",
      matchNumber: `M${matchCounter++}`,
      score1: 0,
      score2: 0,
      raceTo: 9,
      status: "pending",
      round: "losers-qualifying",
      bracket: "losers",
    });

    // Losers R1
    for (let i = 0; i < 3; i++) {
      allMatches.push({
        id: `losers-r1-${i}`,
        matchNumber: `M${matchCounter++}`,
        score1: 0,
        score2: 0,
        raceTo: 9,
        status: "pending",
        round: "losers-r1",
        bracket: "losers",
      });
    }

    // Losers R2
    for (let i = 0; i < 2; i++) {
      allMatches.push({
        id: `losers-r2-${i}`,
        matchNumber: `M${matchCounter++}`,
        score1: 0,
        score2: 0,
        raceTo: 9,
        status: "pending",
        round: "losers-r2",
        bracket: "losers",
      });
    }

    // Losers R3
    allMatches.push({
      id: "losers-r3-0",
      matchNumber: `M${matchCounter++}`,
      score1: 0,
      score2: 0,
      raceTo: 9,
      status: "pending",
      round: "losers-r3",
      bracket: "losers",
    });

    // Losers R4
    allMatches.push({
      id: "losers-r4-0",
      matchNumber: `M${matchCounter++}`,
      score1: 0,
      score2: 0,
      raceTo: 9,
      status: "pending",
      round: "losers-r4",
      bracket: "losers",
    });

    console.log("Created matches:", allMatches.length);
    setMatches(allMatches);

    // Save all matches to Firebase
    try {
      console.log("Saving matches to Firebase...");
      const matchesRef = collection(db, "matches");
      for (const match of allMatches) {
        await setDoc(doc(matchesRef, match.id), match);
        console.log(`Saved match ${match.matchNumber} to Firebase`);
      }
      console.log("All matches saved to Firebase successfully!");
    } catch (error) {
      console.error("Error saving matches to Firebase:", error);
    }
  }, [qualifyingMatches]);

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
          console.log("No matches found, initializing...");
          // Only initialize if manager is logged in
          if (isManager) {
            console.log("Manager is logged in, initializing matches...");
            await initializeMatches();
          } else {
            console.log(
              "Not logged in as manager, matches will be initialized after login"
            );
            setMatches([]);
          }
        } else {
          console.log("Loading existing matches from Firebase...");
          const matchesData = matchesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Match[];
          console.log("Loaded matches:", matchesData.length);
          setMatches(matchesData);
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
      setIsModalOpen(true);
    }
  };

  // Get match by ID
  const getMatchById = (matchId: string) => {
    return matches.find((m) => m.id === matchId);
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

    const updatedMatches = matches.map((match) => {
      if (match.id === selectedMatch.id) {
        return updatedMatch;
      }
      return match;
    });

    setMatches(updatedMatches);

    // Save to Firebase
    try {
      const matchRef = doc(db, "matches", selectedMatch.id);
      await updateDoc(matchRef, {
        player1: player1 || null,
        player2: player2 || null,
        score1: score1,
        score2: score2,
        raceTo: raceTo,
        winner: winner || null,
        status: updatedMatch.status,
      });
    } catch (error) {
      console.error("Error saving match to Firebase:", error);
    }

    setIsModalOpen(false);
  };

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
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tournament Matches
          </h1>
        </div>

        {/* Main Container: Column Layout */}
        <div className="flex flex-col space-y-2">
          {/* Row 1: Winners Bracket */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                WB
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Winners Bracket
              </h2>
            </div>

            {/* Horizontal Scrolling Container */}
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[300px]">
                {/* Column 1: Qualifying matches (dynamic) */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {matchNumbers.qualifying.length > 0 ? (
                      matchNumbers.qualifying.map((matchId, index) => {
                        const match = getMatchById(
                          `winners-qualifying-${index}`
                        );
                        return (
                          <div
                            key={index}
                            className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                            onClick={() =>
                              handleMatchClick(`winners-qualifying-${index}`)
                            }
                          >
                            <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                              {/* Column 1: Match Number (1x1) */}
                              <div className="flex items-center justify-center border-r border-gray-400">
                                <div className="text-sm text-gray-700 font-medium">
                                  {matchId}
                                </div>
                              </div>

                              {/* Column 2: Player Names (2x1) */}
                              <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                                <div
                                  className={`text-base text-center border-b border-gray-400 pb-1 ${
                                    match?.winner === "player1"
                                      ? "text-yellow-600 font-bold"
                                      : "text-gray-800 font-medium"
                                  }`}
                                >
                                  {match?.player1?.name ||
                                    `Player ${index * 2 + 7}`}
                                </div>
                                <div
                                  className={`text-base text-center pt-1 ${
                                    match?.winner === "player2"
                                      ? "text-yellow-600 font-bold"
                                      : "text-gray-800 font-medium"
                                  }`}
                                >
                                  {match?.player2?.name ||
                                    `Player ${index * 2 + 8}`}
                                </div>
                              </div>

                              {/* Column 3: Scores (2x1) */}
                              <div className="flex flex-col justify-center space-y-0">
                                <div
                                  className={`text-base font-bold text-center border-b border-gray-400 pb-1 ${
                                    match?.winner === "player1"
                                      ? "text-yellow-600"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {match?.score1 || 0}
                                </div>
                                <div
                                  className={`text-base font-bold text-center pt-1 ${
                                    match?.winner === "player2"
                                      ? "text-yellow-600"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {match?.score2 || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-800 font-medium text-sm">
                        No qualifying matches
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: 4 matches */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Round 1
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {matchNumbers.round1.map((matchId, index) => {
                      const match = getMatchById(`winners-round1-${index}`);
                      const needsQualifying =
                        qualifyingMatches > 0 && (index === 0 || index === 3);
                      return (
                        <div
                          key={index}
                          className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                          onClick={() =>
                            handleMatchClick(`winners-round1-${index}`)
                          }
                        >
                          <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                            {/* Column 1: Match Number (1x1) */}
                            <div className="flex items-center justify-center border-r border-gray-400">
                              <div className="text-sm text-gray-700 font-medium">
                                {matchId}
                              </div>
                            </div>

                            {/* Column 2: Player Names (2x1) */}
                            <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                              <div
                                className={`text-base text-center border-b border-gray-400 pb-1 font-medium ${
                                  match?.winner === "player1"
                                    ? "text-yellow-600 font-bold"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.player1?.name || `Player ${index + 1}`}
                              </div>
                              <div
                                className={`text-base text-center pt-1 font-medium ${
                                  match?.winner === "player2"
                                    ? "text-yellow-600 font-bold"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.player2?.name ||
                                  (needsQualifying
                                    ? "TBD"
                                    : `Player ${index + 2}`)}
                              </div>
                            </div>

                            {/* Column 3: Scores (2x1) */}
                            <div className="flex flex-col justify-center space-y-0">
                              <div
                                className={`text-base font-bold text-center border-b border-gray-400 pb-1 ${
                                  match?.winner === "player1"
                                    ? "text-yellow-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.score1 || 0}
                              </div>
                              <div
                                className={`text-base font-bold text-center pt-1 ${
                                  match?.winner === "player2"
                                    ? "text-yellow-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.score2 || (needsQualifying ? "-" : 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 3: 2 matches */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Round 2
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {matchNumbers.round2.map((matchId, index) => {
                      const match = getMatchById(`winners-round2-${index}`);
                      return (
                        <div
                          key={index}
                          className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                          onClick={() =>
                            handleMatchClick(`winners-round2-${index}`)
                          }
                        >
                          <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                            {/* Column 1: Match Number (1x1) */}
                            <div className="flex items-center justify-center border-r border-gray-400">
                              <div className="text-sm text-gray-700 font-medium">
                                {matchId}
                              </div>
                            </div>

                            {/* Column 2: Player Names (2x1) */}
                            <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                              <div
                                className={`text-base text-center border-b border-gray-400 pb-1 font-medium ${
                                  match?.winner === "player1"
                                    ? "text-yellow-600 font-bold"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.player1?.name || "TBD"}
                              </div>
                              <div
                                className={`text-base text-center pt-1 font-medium ${
                                  match?.winner === "player2"
                                    ? "text-yellow-600 font-bold"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.player2?.name || "TBD"}
                              </div>
                            </div>

                            {/* Column 3: Scores (2x1) */}
                            <div className="flex flex-col justify-center space-y-0">
                              <div
                                className={`text-base font-bold text-center border-b border-gray-400 pb-1 ${
                                  match?.winner === "player1"
                                    ? "text-yellow-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.score1 || "-"}
                              </div>
                              <div
                                className={`text-base font-bold text-center pt-1 ${
                                  match?.winner === "player2"
                                    ? "text-yellow-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.score2 || "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 4: 1 match */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Round 3
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {(() => {
                      const match = getMatchById("winners-round3-0");
                      return (
                        <div
                          className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                          onClick={() => handleMatchClick("winners-round3-0")}
                        >
                          <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                            {/* Column 1: Match Number (1x1) */}
                            <div className="flex items-center justify-center border-r border-gray-400">
                              <div className="text-sm text-gray-700 font-medium">
                                {matchNumbers.round3[0]}
                              </div>
                            </div>

                            {/* Column 2: Player Names (2x1) */}
                            <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                              <div
                                className={`text-base text-center border-b border-gray-400 pb-1 font-medium ${
                                  match?.winner === "player1"
                                    ? "text-yellow-600 font-bold"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.player1?.name || "TBD"}
                              </div>
                              <div
                                className={`text-base text-center pt-1 font-medium ${
                                  match?.winner === "player2"
                                    ? "text-yellow-600 font-bold"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.player2?.name || "TBD"}
                              </div>
                            </div>

                            {/* Column 3: Scores (2x1) */}
                            <div className="flex flex-col justify-center space-y-0">
                              <div
                                className={`text-base font-bold text-center border-b border-gray-400 pb-1 ${
                                  match?.winner === "player1"
                                    ? "text-yellow-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.score1 || "-"}
                              </div>
                              <div
                                className={`text-base font-bold text-center pt-1 ${
                                  match?.winner === "player2"
                                    ? "text-yellow-600"
                                    : "text-gray-800"
                                }`}
                              >
                                {match?.score2 || "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Winner Rectangle */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Winner
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    <div className="w-40 h-12 border-2 border-gray-300 rounded-lg bg-white px-2 py-px flex items-center justify-center">
                      <div className="text-base font-bold text-gray-700 text-center">
                        Group A WB Winner
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-300 my-2"></div>

          {/* Row 2: Losers Bracket */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                LB
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Losers Bracket
              </h2>
            </div>

            {/* Horizontal Scrolling Container */}
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[300px]">
                {/* Losers (Qualifying) - 1 match */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Losers
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    <div className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-red-500 hover:shadow-md transition-all">
                      <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                        {/* Column 1: Match Number */}
                        <div className="flex items-center justify-center border-r border-gray-400">
                          <div className="text-sm text-gray-700 font-medium">
                            M{qualifyingMatches + 4 + 2 + 1 + 1}
                          </div>
                        </div>
                        {/* Column 2: Player Names */}
                        <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                          <div className="text-base text-gray-800 font-medium text-center border-b border-gray-400 pb-1">
                            TBD
                          </div>
                          <div className="text-base text-gray-800 font-medium text-center pt-1">
                            TBD
                          </div>
                        </div>
                        {/* Column 3: Scores */}
                        <div className="flex flex-col justify-center space-y-0">
                          <div className="text-base font-bold text-gray-800 text-center border-b border-gray-400 pb-1">
                            -
                          </div>
                          <div className="text-base font-bold text-gray-800 text-center pt-1">
                            -
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Losers R1 - 3 matches */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Losers R1
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-red-500 hover:shadow-md transition-all"
                      >
                        <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                          {/* Column 1: Match Number */}
                          <div className="flex items-center justify-center border-r border-gray-400">
                            <div className="text-sm text-gray-700 font-medium">
                              M{qualifyingMatches + 4 + 2 + 1 + 1 + 1 + index}
                            </div>
                          </div>
                          {/* Column 2: Player Names */}
                          <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                            <div className="text-base text-gray-800 font-medium text-center border-b border-gray-400 pb-1">
                              TBD
                            </div>
                            <div className="text-base text-gray-800 font-medium text-center pt-1">
                              TBD
                            </div>
                          </div>
                          {/* Column 3: Scores */}
                          <div className="flex flex-col justify-center space-y-0">
                            <div className="text-base font-bold text-gray-800 text-center border-b border-gray-400 pb-1">
                              -
                            </div>
                            <div className="text-base font-bold text-gray-800 text-center pt-1">
                              -
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Losers R2 - 2 matches */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Losers R2
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-red-500 hover:shadow-md transition-all"
                      >
                        <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                          {/* Column 1: Match Number */}
                          <div className="flex items-center justify-center border-r border-gray-400">
                            <div className="text-sm text-gray-700 font-medium">
                              M
                              {qualifyingMatches +
                                4 +
                                2 +
                                1 +
                                1 +
                                1 +
                                3 +
                                index}
                            </div>
                          </div>
                          {/* Column 2: Player Names */}
                          <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                            <div className="text-base text-gray-800 font-medium text-center border-b border-gray-400 pb-1">
                              TBD
                            </div>
                            <div className="text-base text-gray-800 font-medium text-center pt-1">
                              TBD
                            </div>
                          </div>
                          {/* Column 3: Scores */}
                          <div className="flex flex-col justify-center space-y-0">
                            <div className="text-base font-bold text-gray-800 text-center border-b border-gray-400 pb-1">
                              -
                            </div>
                            <div className="text-base font-bold text-gray-800 text-center pt-1">
                              -
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Losers R3 - 1 match */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Losers R3
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    <div className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-red-500 hover:shadow-md transition-all">
                      <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                        {/* Column 1: Match Number */}
                        <div className="flex items-center justify-center border-r border-gray-400">
                          <div className="text-sm text-gray-700 font-medium">
                            M{qualifyingMatches + 4 + 2 + 1 + 1 + 1 + 3 + 2}
                          </div>
                        </div>
                        {/* Column 2: Player Names */}
                        <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                          <div className="text-base text-gray-800 font-medium text-center border-b border-gray-400 pb-1">
                            TBD
                          </div>
                          <div className="text-base text-gray-800 font-medium text-center pt-1">
                            TBD
                          </div>
                        </div>
                        {/* Column 3: Scores */}
                        <div className="flex flex-col justify-center space-y-0">
                          <div className="text-base font-bold text-gray-800 text-center border-b border-gray-400 pb-1">
                            -
                          </div>
                          <div className="text-base font-bold text-gray-800 text-center pt-1">
                            -
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Losers R4 - 1 match */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Losers R4
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    <div className="w-40 h-16 border-2 border-gray-300 rounded-lg bg-white px-2 py-px cursor-pointer hover:border-red-500 hover:shadow-md transition-all">
                      <div className="grid grid-cols-[1fr_3fr_1fr] gap-2 h-full">
                        {/* Column 1: Match Number */}
                        <div className="flex items-center justify-center border-r border-gray-400">
                          <div className="text-sm text-gray-700 font-medium">
                            M{qualifyingMatches + 4 + 2 + 1 + 1 + 1 + 3 + 2 + 1}
                          </div>
                        </div>
                        {/* Column 2: Player Names */}
                        <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
                          <div className="text-base text-gray-800 font-medium text-center border-b border-gray-400 pb-1">
                            TBD
                          </div>
                          <div className="text-base text-gray-800 font-medium text-center pt-1">
                            TBD
                          </div>
                        </div>
                        {/* Column 3: Scores */}
                        <div className="flex flex-col justify-center space-y-0">
                          <div className="text-base font-bold text-gray-800 text-center border-b border-gray-400 pb-1">
                            -
                          </div>
                          <div className="text-base font-bold text-gray-800 text-center pt-1">
                            -
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loser Bracket Winner */}
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-gray-800 mb-2">
                    Winner
                  </div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    <div className="w-40 h-12 border-2 border-gray-300 rounded-lg bg-white px-2 py-px flex items-center justify-center">
                      <div className="text-base font-bold text-gray-700 text-center">
                        Group A LB Winner
                      </div>
                    </div>
                  </div>
                </div>
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
              {/* Player 1 Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Player 1
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  value={selectedPlayer1}
                  onChange={(e) => setSelectedPlayer1(e.target.value)}
                >
                  <option value="">Select Player</option>
                  {players
                    .filter((player) => player.id !== selectedPlayer2)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Player 2 Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Player 2
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  value={selectedPlayer2}
                  onChange={(e) => setSelectedPlayer2(e.target.value)}
                >
                  <option value="">Select Player</option>
                  {players
                    .filter((player) => player.id !== selectedPlayer1)
                    .map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Race to X */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Race to X
                </label>
                <input
                  type="number"
                  min="1"
                  max="21"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                  value={raceTo}
                  onChange={(e) => setRaceTo(parseInt(e.target.value) || 9)}
                />
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score 1
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                    value={score1}
                    onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Score 2
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"
                    value={score2}
                    onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

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

export default MatchesPage;
