"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLive, GameMode } from "@/contexts/LiveContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const Navigation = () => {
  const pathname = usePathname();
  const {
    isLive,
    gameMode,
    setGameMode,
    pbsLiveIsLive,
    pbsGameMode,
    setPbsGameMode,
    pbsTourIsLive,
    pbsTourGameMode,
    setPbsTourGameMode,
    pbsTour2IsLive,
    pbsTour2GameMode,
    setPbsTour2GameMode,
    threePlayersIsLive,
    threePlayersGameMode,
    setThreePlayersGameMode,
  } = useLive();
  const { isManager } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Don't render navigation when live
  if (isLive || pbsLiveIsLive || pbsTourIsLive || pbsTour2IsLive || threePlayersIsLive) {
    return null;
  }

  const navItems = [
    {
      name: "Tournament",
      href: "/tournament",
    },
    {
      name: "Players",
      href: "/players",
    },
    {
      name: "Matches",
      href: "/matches",
    },
    {
      name: "Live Match",
      href: "/live-match",
    },
    {
      name: "PBS Live",
      href: "/pbs-live",
    },
    {
      name: "PBS Tour",
      href: "/pbs-tour",
    },
    {
      name: "PBS Tour 2",
      href: "/pbs-tour-2",
    },
    {
      name: "3 Players",
      href: "/3-players",
    },
    {
      name: "Ring",
      href: "/ring",
    },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Pinoy SG Billiards
              </h1>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Game Mode Selector - Placed on the right */}
          <div className="flex items-center">
            {isManager && pathname === "/live-match" && (
              <div className="hidden sm:flex items-center space-x-2 mr-4">
                <label
                  htmlFor="gameMode"
                  className="text-sm font-medium text-gray-700"
                >
                  Game Mode:
                </label>
                <select
                  id="gameMode"
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value as GameMode)}
                  className="rounded-md border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/pbs-live" && (
              <div className="hidden sm:flex items-center space-x-2 mr-4">
                <label
                  htmlFor="pbsGameMode"
                  className="text-sm font-medium text-gray-700"
                >
                  Game Mode:
                </label>
                <select
                  id="pbsGameMode"
                  value={pbsGameMode}
                  onChange={(e) =>
                    setPbsGameMode(e.target.value as GameMode)
                  }
                  className="rounded-md border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/pbs-tour" && (
              <div className="hidden sm:flex items-center space-x-2 mr-4">
                <label
                  htmlFor="pbsTourGameMode"
                  className="text-sm font-medium text-gray-700"
                >
                  Game Mode:
                </label>
                <select
                  id="pbsTourGameMode"
                  value={pbsTourGameMode}
                  onChange={(e) =>
                    setPbsTourGameMode(e.target.value as GameMode)
                  }
                  className="rounded-md border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/pbs-tour-2" && (
              <div className="hidden sm:flex items-center space-x-2 mr-4">
                <label
                  htmlFor="pbsTour2GameMode"
                  className="text-sm font-medium text-gray-700"
                >
                  Game Mode:
                </label>
                <select
                  id="pbsTour2GameMode"
                  value={pbsTour2GameMode}
                  onChange={(e) =>
                    setPbsTour2GameMode(e.target.value as GameMode)
                  }
                  className="rounded-md border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/3-players" && (
              <div className="hidden sm:flex items-center space-x-2 mr-4">
                <label
                  htmlFor="threePlayersGameMode"
                  className="text-sm font-medium text-gray-700"
                >
                  Game Mode:
                </label>
                <select
                  id="threePlayersGameMode"
                  value={threePlayersGameMode}
                  onChange={(e) =>
                    setThreePlayersGameMode(e.target.value as GameMode)
                  }
                  className="rounded-md border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={`${isMobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isMobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`${isMobileMenuOpen ? "block" : "hidden"} sm:hidden`}>
          <div className="pt-2 pb-3 space-y-1">
            {/* Game Mode Selector in Mobile Menu */}
            {isManager && pathname === "/live-match" && (
              <div className="px-4 py-2">
                <label
                  htmlFor="mobileGameMode"
                  className="block text-base font-medium text-gray-700 mb-1"
                >
                  Game Mode
                </label>
                <select
                  id="mobileGameMode"
                  value={gameMode}
                  onChange={(e) => {
                    setGameMode(e.target.value as GameMode);
                    setIsMobileMenuOpen(false); // Close menu on selection
                  }}
                  className="w-full rounded-md border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/pbs-live" && (
              <div className="px-4 py-2">
                <label
                  htmlFor="mobilePbsGameMode"
                  className="block text-base font-medium text-gray-700 mb-1"
                >
                  Game Mode
                </label>
                <select
                  id="mobilePbsGameMode"
                  value={pbsGameMode}
                  onChange={(e) => {
                    setPbsGameMode(e.target.value as GameMode);
                    setIsMobileMenuOpen(false); // Close menu on selection
                  }}
                  className="w-full rounded-md border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/pbs-tour" && (
              <div className="px-4 py-2">
                <label
                  htmlFor="mobilePbsTourGameMode"
                  className="block text-base font-medium text-gray-700 mb-1"
                >
                  Game Mode
                </label>
                <select
                  id="mobilePbsTourGameMode"
                  value={pbsTourGameMode}
                  onChange={(e) => {
                    setPbsTourGameMode(e.target.value as GameMode);
                    setIsMobileMenuOpen(false); // Close menu on selection
                  }}
                  className="w-full rounded-md border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/pbs-tour-2" && (
              <div className="px-4 py-2">
                <label
                  htmlFor="mobilePbsTour2GameMode"
                  className="block text-base font-medium text-gray-700 mb-1"
                >
                  Game Mode
                </label>
                <select
                  id="mobilePbsTour2GameMode"
                  value={pbsTour2GameMode}
                  onChange={(e) => {
                    setPbsTour2GameMode(e.target.value as GameMode);
                    setIsMobileMenuOpen(false); // Close menu on selection
                  }}
                  className="w-full rounded-md border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {isManager && pathname === "/3-players" && (
              <div className="px-4 py-2">
                <label
                  htmlFor="mobileThreePlayersGameMode"
                  className="block text-base font-medium text-gray-700 mb-1"
                >
                  Game Mode
                </label>
                <select
                  id="mobileThreePlayersGameMode"
                  value={threePlayersGameMode}
                  onChange={(e) => {
                    setThreePlayersGameMode(e.target.value as GameMode);
                    setIsMobileMenuOpen(false); // Close menu on selection
                  }}
                  className="w-full rounded-md border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="9-ball">9-ball</option>
                  <option value="10-ball">10-ball</option>
                  <option value="15-ball">15-ball</option>
                </select>
              </div>
            )}
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
