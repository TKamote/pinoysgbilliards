"use client";

import Image from "next/image";

interface Player {
  id: string;
  name: string;
  photoURL?: string;
  points: number;
}

interface WinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: Player | null;
  getPlayerPlaceholder: (playerId: string) => string;
  player1Score: number;
  player2Score: number;
  player1Name: string;
  player2Name: string;
}

const WinnerModal = ({
  isOpen,
  onClose,
  winner,
  getPlayerPlaceholder,
  player1Score,
  player2Score,
  player1Name,
  player2Name,
}: WinnerModalProps) => {
  if (!isOpen || !winner) return null;

  const getPlayerPhoto = () => {
    return winner?.photoURL || null;
  };

  const getPlaceholder = () => {
    if (winner?.id) {
      return getPlayerPlaceholder(winner.id);
    }
    return "/avatar-placeholder-1.svg";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-md flex flex-col items-center shadow-2xl">
        {/* Winner Text */}
        <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-yellow-500 mb-4 sm:mb-5 md:mb-6 animate-pulse">
          WINNER
        </div>

        {/* Winner Photo */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden border-2 sm:border-3 md:border-4 border-yellow-500 shadow-xl mb-4 sm:mb-5 md:mb-6">
          {getPlayerPhoto() ? (
            <Image
              src={getPlayerPhoto()!}
              alt={winner.name}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <Image
              src={getPlaceholder()}
              alt={winner.name}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Winner Name */}
        <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 text-center px-2">
          {winner.name}
        </div>

        {/* Final Score */}
        <div className="bg-gray-100 rounded-lg p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6 w-full">
          <div className="text-center mb-2">
            <div className="text-xs sm:text-sm text-gray-600 font-medium mb-2">Final Score</div>
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 md:space-x-4">
              <div className="flex flex-col items-center">
                <div className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-700 truncate max-w-[80px] sm:max-w-none">{player1Name}</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">{player1Score}</div>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-400">-</div>
              <div className="flex flex-col items-center">
                <div className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-700 truncate max-w-[80px] sm:max-w-none">{player2Name}</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{player2Score}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 sm:px-7 sm:py-2.5 md:px-8 md:py-3 rounded-lg text-sm sm:text-base md:text-lg font-bold transition-colors w-full sm:w-auto"
        >
          Reset Match
        </button>
      </div>
    </div>
  );
};

export default WinnerModal;

