"use client";

import { useState } from "react";

const LiveMatchPage = () => {
  const [player1Name] = useState("Player 1");
  const [player2Name] = useState("Player 2");
  const [player1Score] = useState(0);
  const [player2Score] = useState(0);

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Live Match Title - Top Corner */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🎱 Live Match
          </h1>
        </div>

        {/* Players Scoring Container - Bottom */}
        <div className="bg-white rounded-lg shadow-lg px-2.5 py-4 mt-auto w-fit mx-auto">
          <div className="flex items-center justify-between">
            {/* Player 1 Profile Photo */}
            <div className="w-18 h-18 bg-linear-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-6xl">
              👨
            </div>

            {/* Center Content */}
            <div className="flex items-center justify-center space-x-12 flex-1">
              {/* Player 1 Name */}
              <div className="bg-blue-50 px-28 py-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {player1Name}
                </div>
              </div>

              {/* Scores and VS */}
              <div
                className="flex items-center justify-center space-x-4 bg-gray-50 rounded-lg"
                style={{ width: "calc(2rem + 8rem + 2rem)", height: "4rem" }}
              >
                <div className="text-4xl font-bold text-blue-600">
                  {player1Score}
                </div>
                <div className="text-3xl font-bold text-gray-400">VS</div>
                <div className="text-4xl font-bold text-blue-600">
                  {player2Score}
                </div>
              </div>

              {/* Player 2 Name */}
              <div className="bg-blue-50 px-28 py-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {player2Name}
                </div>
              </div>
            </div>

            {/* Player 2 Profile Photo */}
            <div className="w-18 h-18 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-6xl">
              👩
            </div>
          </div>
        </div>

        {/* Billiards Ball Icons */}
        <div className="mt-8 flex flex-col items-center">
          <div className="flex space-x-4">
            {/* Ball 1 - Red */}
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              1
            </div>

            {/* Ball 2 - Yellow */}
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              2
            </div>

            {/* Ball 3 - Blue */}
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              3
            </div>

            {/* Ball 4 - Purple */}
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              4
            </div>

            {/* Ball 5 - Orange */}
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              5
            </div>

            {/* Ball 6 - Green */}
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              6
            </div>

            {/* Ball 7 - Pink */}
            <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              7
            </div>

            {/* Ball 8 - Black */}
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-lg">
              8
            </div>

            {/* Ball 9 - Light Yellow */}
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
              9
            </div>

            {/* Ball 10 - Dark Blue */}
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              10
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMatchPage;
