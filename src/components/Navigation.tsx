"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLive } from "@/contexts/LiveContext";

const Navigation = () => {
  const pathname = usePathname();
  const { isLive } = useLive();

  // Don't render navigation when live
  if (isLive) {
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
      name: "Standby",
      href: "/standby",
    },
    {
      name: "Live Match",
      href: "/live-match",
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
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
