"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useLive, type GameMode } from "@/contexts/LiveContext";
import LoginModal from "@/components/LoginModal";

/**
 * Single minimal nav used on all pages so the Players tab is always clickable.
 * Login/Logout in header so it's always obvious.
 */
const NAV_ITEMS = [
  { name: "Home", href: "/home" },
  { name: "Players", href: "/players" },
  { name: "Invitational", href: "/invitational" },
] as const;

export default function LayoutWithNav({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, username, signOut, isManager } = useAuth();
  const {
    isLive,
    pbsLiveIsLive,
    pbsTourIsLive,
    pbsTour2IsLive,
    threePlayersIsLive,
    tourManagerIsLive,
    pbsCup8IsLive,
    gameMode,
    setGameMode,
    pbsGameMode,
    setPbsGameMode,
    pbsTourGameMode,
    setPbsTourGameMode,
    pbsTour2GameMode,
    setPbsTour2GameMode,
    threePlayersGameMode,
    setThreePlayersGameMode,
    tourManagerGameMode,
    setTourManagerGameMode,
    pbsCup8GameMode,
    setPbsCup8GameMode,
  } = useLive();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Hide nav only on this page when this page's GO LIVE is on (per-page, not global)
  const thisPageLive =
    (pathname === "/live-match" && isLive) ||
    (pathname === "/arys" && isLive) ||
    (pathname === "/pbs-live" && pbsLiveIsLive) ||
    (pathname === "/pbs-tour" && pbsTourIsLive) ||
    (pathname === "/pbs-tour-2" && pbsTour2IsLive) ||
    (pathname === "/3-players" && threePlayersIsLive) ||
    (pathname === "/tour-manager" && tourManagerIsLive) ||
    (pathname === "/pbs-cup-8" && pbsCup8IsLive);
  if (thisPageLive) {
    return (
      <>
        <main className="min-h-screen bg-transparent">{children}</main>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200 relative z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-4">
            <Link href="/home" className="flex items-center shrink-0">
              <Image
                src="/PinoySGTumbnailYT.png"
                alt="Pinoy SG Billiards"
                width={192}
                height={58}
                className="h-12 w-auto sm:h-14 rounded-[10%]"
                priority
                unoptimized
              />
            </Link>
            <div className="flex items-center gap-6 sm:gap-8 text-sm font-medium relative z-10">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 transition-colors duration-200 ${
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
            {/* Game Mode selector (9/10/15 ball) - shown on overlay pages for managers */}
            {isManager && (
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                {(pathname === "/live-match" || pathname === "/arys") && (
                  <>
                    <label htmlFor="nav-gameMode" className="font-medium text-gray-700">Game Mode:</label>
                    <select
                      id="nav-gameMode"
                      value={gameMode}
                      onChange={(e) => setGameMode(e.target.value as GameMode)}
                      className="rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 py-1"
                    >
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="15-ball">15-ball</option>
                    </select>
                  </>
                )}
                {pathname === "/pbs-live" && (
                  <>
                    <label htmlFor="nav-pbsGameMode" className="font-medium text-gray-700">Game Mode:</label>
                    <select id="nav-pbsGameMode" value={pbsGameMode} onChange={(e) => setPbsGameMode(e.target.value as GameMode)} className="rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 py-1">
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="15-ball">15-ball</option>
                    </select>
                  </>
                )}
                {pathname === "/pbs-tour" && (
                  <>
                    <label htmlFor="nav-pbsTourGameMode" className="font-medium text-gray-700">Game Mode:</label>
                    <select id="nav-pbsTourGameMode" value={pbsTourGameMode} onChange={(e) => setPbsTourGameMode(e.target.value as GameMode)} className="rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 py-1">
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="15-ball">15-ball</option>
                    </select>
                  </>
                )}
                {pathname === "/pbs-tour-2" && (
                  <>
                    <label htmlFor="nav-pbsTour2GameMode" className="font-medium text-gray-700">Game Mode:</label>
                    <select id="nav-pbsTour2GameMode" value={pbsTour2GameMode} onChange={(e) => setPbsTour2GameMode(e.target.value as GameMode)} className="rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 py-1">
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="15-ball">15-ball</option>
                    </select>
                  </>
                )}
                {pathname === "/3-players" && (
                  <>
                    <label htmlFor="nav-threePlayersGameMode" className="font-medium text-gray-700">Game Mode:</label>
                    <select id="nav-threePlayersGameMode" value={threePlayersGameMode} onChange={(e) => setThreePlayersGameMode(e.target.value as GameMode)} className="rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 py-1">
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="15-ball">15-ball</option>
                    </select>
                  </>
                )}
                {pathname === "/tour-manager" && (
                  <>
                    <label htmlFor="nav-tourManagerGameMode" className="font-medium text-gray-700">Game Mode:</label>
                    <select id="nav-tourManagerGameMode" value={tourManagerGameMode} onChange={(e) => setTourManagerGameMode(e.target.value as GameMode)} className="rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 py-1">
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="15-ball">15-ball</option>
                    </select>
                  </>
                )}
                {pathname === "/pbs-cup-8" && (
                  <>
                    <label htmlFor="nav-pbsCup8GameMode" className="font-medium text-gray-700">Game Mode:</label>
                    <select id="nav-pbsCup8GameMode" value={pbsCup8GameMode} onChange={(e) => setPbsCup8GameMode(e.target.value as GameMode)} className="rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 py-1">
                      <option value="9-ball">9-ball</option>
                      <option value="10-ball">10-ball</option>
                      <option value="15-ball">15-ball</option>
                    </select>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    Welcome, {username ?? "User"}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="min-h-screen bg-transparent">{children}</main>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
