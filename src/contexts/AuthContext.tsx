"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "manager" | "user";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isManager: boolean;
  userRole: UserRole | null;
  username: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const emailUsername = firebaseUser.email?.split("@")[0] || "User";
        setUsername(emailUsername);
        try {
          // Role from Firestore users/{uid}.role: "manager" | "user"
          // Create docs in Firestore: users collection, doc id = auth uid, field role = "manager" or "user"
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const role = userDoc.exists() && userDoc.data()?.role === "manager"
            ? "manager"
            : "user";
          setUserRole(role);
        } catch {
          setUserRole("user");
        }
      } else {
        setUsername(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const isManager = userRole === "manager";

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isManager,
    userRole,
    username,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
