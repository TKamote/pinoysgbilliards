"use client";

import { useState } from "react";
import Image from "next/image";

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  points: number;
}

interface PlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  selectedPlayerId: string | null;
  onSelect: (player: Player) => void;
  title: string;
}

const PlayerSelectionModal = ({
  isOpen,
  onClose,
  players,
  selectedPlayerId,
  onSelect,
  title,
}: PlayerSelectionModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  // Filter players based on search query
  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Default placeholder photo
  const defaultPhoto = "👤";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            autoFocus
          />
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchQuery ? "No players found" : "No players available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => {
                const isSelected = player.id === selectedPlayerId;
                return (
                  <button
                    key={player.id}
                    onClick={() => {
                      onSelect(player);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {/* Player Photo */}
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-gray-300">
                      {player.photoURL ? (
                        <Image
                          src={player.photoURL}
                          alt={player.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl">
                          {defaultPhoto}
                        </div>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg text-gray-900">
                        {player.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {player.points} points
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="text-blue-500">
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerSelectionModal;
