"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const USAGE_DOC = "usage/current";
const DAILY_LIMIT = 1000;

interface UsageContextType {
  count: number;
  limit: number;
  loading: boolean;
  refetch: () => Promise<void>;
  isAtLimit: boolean;
  showLimitReachedModal: () => void;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function useUsage() {
  const ctx = useContext(UsageContext);
  if (ctx === undefined) throw new Error("useUsage must be used within UsageProvider");
  return ctx;
}

/** Call this when a Firestore write fails with permission-denied (e.g. daily limit). */
export function useHandleWriteError() {
  const { showLimitReachedModal } = useUsage();
  return useCallback(
    (err: unknown) => {
      const code = (err as { code?: string })?.code;
      if (code === "permission-denied") showLimitReachedModal();
      else throw err;
    },
    [showLimitReachedModal]
  );
}

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, USAGE_DOC));
      if (snap.exists() && snap.data()) {
        setCount(Number(snap.data()?.count) || 0);
      } else {
        setCount(0);
      }
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const value: UsageContextType = {
    count,
    limit: DAILY_LIMIT,
    loading,
    refetch,
    isAtLimit: count >= DAILY_LIMIT,
    showLimitReachedModal: () => setShowModal(true),
  };

  return (
    <UsageContext.Provider value={value}>
      {children}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Daily limit reached</h3>
            <p className="mt-2 text-gray-600">
              You&apos;ve reached your daily write limit ({DAILY_LIMIT}). Try again tomorrow.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </UsageContext.Provider>
  );
}
