"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

const allOverlayLinks = [
  { name: "Live Match", href: "/live-match" },
  { name: "PBS Cup 8", href: "/pbs-cup-8" },
  { name: "PBS Live", href: "/pbs-live" },
  { name: "PBS Tour", href: "/pbs-tour" },
  { name: "Pinoy Sargo", href: "/pbs-tour-2" },
  { name: "Ring Games", href: "/3-players" },
  { name: "Arys", href: "/arys" },
  { name: "Tour Manager-4", href: "/tour-manager" },
];

const userOverlayLinks = [
  { name: "Pinoy Sargo", href: "/pbs-tour-2" },
  { name: "Arys", href: "/arys" },
  { name: "Tour Manager-4", href: "/tour-manager" },
];

const HomePage = () => {
  const { user, userRole } = useAuth();

  const overlayLinks = useMemo(() => {
    if (user && userRole !== "manager") return userOverlayLinks;
    return allOverlayLinks;
  }, [user, userRole]);

  return (
    <div className="p-3 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Home
          </h1>
          <p className="text-gray-600 mt-2">
            Pinoy SG Billiards – Overlays &amp; links
          </p>
        </div>

        {overlayLinks.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Overlays
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Open an overlay to use in OBS or on another device.
            </p>
            <ul className="space-y-2">
              {overlayLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-medium transition-colors border border-gray-200 hover:border-blue-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
