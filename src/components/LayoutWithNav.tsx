"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useLive } from "@/contexts/LiveContext";
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
  const { user, username, signOut } = useAuth();
  const {
    isLive,
    pbsLiveIsLive,
    pbsTourIsLive,
    pbsTour2IsLive,
    threePlayersIsLive,
    tourManagerIsLive,
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
    (pathname === "/tour-manager" && tourManagerIsLive);
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
