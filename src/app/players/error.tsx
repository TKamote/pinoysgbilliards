"use client";

import { useEffect } from "react";

export default function PlayersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Players page error:", error);
  }, [error]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          The Players page could not load. You can try again or go back home.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Try again
          </button>
          <a
            href="/home"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
          >
            Go to Home
          </a>
        </div>
      </div>
    </div>
  );
}
