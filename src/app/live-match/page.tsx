"use client";

import { useState } from "react";
import Image from "next/image";
import { useLive } from "@/contexts/LiveContext";

const LiveMatchPage = () => {
  const [player1Name] = useState("Owen");
  const [player2Name] = useState("Dave");
  const [player1Score] = useState(0);
  const [player2Score] = useState(0);
  const { isLive, setIsLive } = useLive();

  // Profile photo URLs - Replace these with actual photo URLs from player profiles
  const player1Photo =
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces";
  const player2Photo =
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces";

  // Track which balls are pocketed (removed)
  const [pocketedBalls, setPocketedBalls] = useState<Set<number>>(new Set());

  // Handle ball click - removes/pockets the ball
  const handleBallClick = (ballNumber: number) => {
    setPocketedBalls((prev) => {
      const newSet = new Set(prev);
      newSet.add(ballNumber);
      return newSet;
    });
  };

  // Reset all balls for a new game
  const handleResetBalls = () => {
    setPocketedBalls(new Set());
  };

  const ballColors = [
    { num: 1, color: "bg-red-500" },
    { num: 2, color: "bg-yellow-500" },
    { num: 3, color: "bg-blue-500" },
    { num: 4, color: "bg-purple-500" },
    { num: 5, color: "bg-orange-500" },
    { num: 6, color: "bg-green-500" },
    { num: 7, color: "bg-pink-500" },
    { num: 8, color: "bg-gray-800" },
    { num: 9, color: "bg-yellow-400" },
  ];

  return (
    <div className="p-6 h-screen flex flex-col bg-transparent">
      <div className="max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Live Button - Top Right Corner */}
        <div className="absolute" style={{ top: "80px", right: "50px" }}>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`text-white px-4 py-2 rounded-full font-bold text-lg transition-all duration-300 ${
              isLive
                ? "bg-linear-to-r from-red-600 to-red-800 animate-pulse"
                : "bg-gray-500 hover:bg-gray-600"
            }`}
          >
            {isLive ? "LIVE" : "GO LIVE"}
          </button>
        </div>

        {/* Logo - Bottom Left Corner */}
        <div className="absolute" style={{ bottom: "20px", left: "20px" }}>
          <Image
            src="/favicon.png"
            alt="Logo"
            width={100}
            height={100}
            className="opacity-70"
            unoptimized
          />
        </div>

        {/* Players Scoring Container - Bottom */}
        <div className="bg-white rounded-lg shadow-lg px-1 py-1 mt-auto w-fit mx-auto">
          <div className="flex items-center justify-between">
            {/* Player 1 Profile Photo */}
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-blue-500 shrink-0">
              <Image
                src={player1Photo}
                alt={player1Name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>

            {/* Center Content */}
            <div className="flex items-center justify-center space-x-2 flex-1">
              {/* Player 1 Name */}
              <div className="bg-red-500 px-28 py-3">
                <div className="text-2xl font-bold text-white">
                  {player1Name}
                </div>
              </div>

              {/* Scores and VS */}
              <div
                className="flex items-center justify-center space-x-5 bg-linear-to-r from-red-600 to-blue-600"
                style={{ width: "calc(2rem + 8rem + 2rem)", height: "3.5rem" }}
              >
                <div className="text-5xl font-bold text-white">
                  {player1Score}
                </div>
                <div className="text-1.5xl font-bold text-white">VS</div>
                <div className="text-5xl font-bold text-white">
                  {player2Score}
                </div>
              </div>

              {/* Player 2 Name */}
              <div className="bg-blue-600 px-28 py-3">
                <div className="text-2xl font-bold text-white">
                  {player2Name}
                </div>
              </div>
            </div>

            {/* Player 2 Profile Photo */}
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-green-500 shrink-0">
              <Image
                src={player2Photo}
                alt={player2Name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Billiards Ball Icons */}
        <div className="mt-4 flex flex-col items-center">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-4 bg-amber-50 rounded-full px-6 py-1">
              {ballColors.map((ball) => {
                const isPocketed = pocketedBalls.has(ball.num);

                return (
                  <div
                    key={ball.num}
                    onClick={() => !isPocketed && handleBallClick(ball.num)}
                    className={`w-12 h-12 ${
                      ball.color
                    } rounded-full flex items-center justify-center text-white font-bold transition-all ${
                      isPocketed
                        ? "opacity-0 cursor-default"
                        : "cursor-pointer hover:scale-110"
                    }`}
                    style={{ fontSize: "22px" }}
                    title={
                      isPocketed ? "Ball pocketed" : "Click to pocket ball"
                    }
                  >
                    {ball.num}
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
                className="h-5 w-5"
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
      </div>
    </div>
  );
};

export default LiveMatchPage;
