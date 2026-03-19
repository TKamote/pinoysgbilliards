"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";
import TournamentWinnerModal from "@/components/TournamentWinnerModal";
import TenPlayerBracketA from "@/components/TenPlayerBracketA";

export type InvitationalTab = "8-double" | "8-double-bracket-a" | "8-double-bracket-b" | "8-double-bracket-c" | "8-double-bracket-d" | "10-double" | "10-double-bracket-a" | "8-single" | "4-double" | "4-single" | "16-single";
const TABS: { id: InvitationalTab; label: string }[] = [
  { id: "8-double", label: "8 Double" },
  { id: "8-double-bracket-a", label: "8D- Bracket A" },
  { id: "8-double-bracket-b", label: "8D- Bracket B" },
  { id: "8-double-bracket-c", label: "8D- Bracket C" },
  { id: "8-double-bracket-d", label: "8D- Bracket D" },
  { id: "10-double", label: "10 Players DE (8–10)" },
  { id: "10-double-bracket-a", label: "10P-Bracket A" },
  { id: "8-single", label: "8 Single" },
  { id: "4-double", label: "4 Double" },
  { id: "4-single", label: "4 Single" },
  { id: "16-single", label: "16 Single" },
];
const DEFAULT_TAB: InvitationalTab = "8-double";
const TOUR_MANAGER_MATCH_ID = "tour-manager";
const FOUR_DOUBLE_GRAND_FINAL_ID = "4-de-m6";
const FLEX_10_CONFIG_PATH = "config/invitational_10double";
export type Flex10PlayerCount = 8 | 9 | 10;

// Types
interface Player {
  id: string;
  name: string;
  points: number;
  photoURL?: string;
}

interface Match {
  id: string;
  matchNumber: string;
  player1?: Player;
  player2?: Player;
  score1: number;
  score2: number;
  raceTo: number;
  winner?: "player1" | "player2";
  status: "pending" | "in_progress" | "completed";
  round: string;
  bracket: "winners" | "losers";
}

type Slot = "player1" | "player2";

// 8-player double elimination: 15 matches (format prefix 8-de- for Option B independence)
const MATCH_IDS_8_DE = ["8-de-m1", "8-de-m2", "8-de-m3", "8-de-m4", "8-de-m5", "8-de-m6", "8-de-m7", "8-de-m8", "8-de-m9", "8-de-m10", "8-de-m11", "8-de-m12", "8-de-m13", "8-de-m14", "8-de-m15"] as const;

const ADVANCEMENT_8_DE: Record<
  string,
  { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }
> = {
  "8-de-m1": { winner: { nextId: "8-de-m5", slot: "player1" }, loser: { nextId: "8-de-m8", slot: "player1" } },
  "8-de-m2": { winner: { nextId: "8-de-m5", slot: "player2" }, loser: { nextId: "8-de-m8", slot: "player2" } },
  "8-de-m3": { winner: { nextId: "8-de-m6", slot: "player1" }, loser: { nextId: "8-de-m9", slot: "player1" } },
  "8-de-m4": { winner: { nextId: "8-de-m6", slot: "player2" }, loser: { nextId: "8-de-m9", slot: "player2" } },
  "8-de-m5": { winner: { nextId: "8-de-m7", slot: "player1" }, loser: { nextId: "8-de-m10", slot: "player1" } },
  "8-de-m6": { winner: { nextId: "8-de-m7", slot: "player2" }, loser: { nextId: "8-de-m11", slot: "player1" } },
  "8-de-m7": { winner: { nextId: "8-de-m14", slot: "player1" }, loser: { nextId: "8-de-m13", slot: "player1" } },
  "8-de-m8": { winner: { nextId: "8-de-m10", slot: "player2" } },
  "8-de-m9": { winner: { nextId: "8-de-m11", slot: "player2" } },
  "8-de-m10": { winner: { nextId: "8-de-m12", slot: "player1" } },
  "8-de-m11": { winner: { nextId: "8-de-m12", slot: "player2" } },
  "8-de-m12": { winner: { nextId: "8-de-m13", slot: "player2" } },
  "8-de-m13": { winner: { nextId: "8-de-m14", slot: "player2" } },
  "8-de-m15": {},
};

const ROUND_LABEL_8_DE: Record<string, string> = {
  "8-de-m1": "WB R1", "8-de-m2": "WB R1", "8-de-m3": "WB R1", "8-de-m4": "WB R1",
  "8-de-m5": "WB R2", "8-de-m6": "WB R2", "8-de-m7": "WB Final",
  "8-de-m8": "LB R1", "8-de-m9": "LB R1", "8-de-m10": "LB R2", "8-de-m11": "LB R2",
  "8-de-m12": "LB R3", "8-de-m13": "LB Final", "8-de-m14": "Grand Final", "8-de-m15": "Bracket Reset",
};

// 8D- Bracket A: same structure as 8 Double, own match ids (8de-a-m1 … 8de-a-m15)
const MATCH_IDS_8_DE_BA = ["8de-a-m1", "8de-a-m2", "8de-a-m3", "8de-a-m4", "8de-a-m5", "8de-a-m6", "8de-a-m7", "8de-a-m8", "8de-a-m9", "8de-a-m10", "8de-a-m11", "8de-a-m12", "8de-a-m13", "8de-a-m14", "8de-a-m15"] as const;

const ADVANCEMENT_8_DE_BA: Record<
  string,
  { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }
> = {
  "8de-a-m1": { winner: { nextId: "8de-a-m5", slot: "player1" }, loser: { nextId: "8de-a-m8", slot: "player1" } },
  "8de-a-m2": { winner: { nextId: "8de-a-m5", slot: "player2" }, loser: { nextId: "8de-a-m8", slot: "player2" } },
  "8de-a-m3": { winner: { nextId: "8de-a-m6", slot: "player1" }, loser: { nextId: "8de-a-m9", slot: "player1" } },
  "8de-a-m4": { winner: { nextId: "8de-a-m6", slot: "player2" }, loser: { nextId: "8de-a-m9", slot: "player2" } },
  "8de-a-m5": { winner: { nextId: "8de-a-m7", slot: "player1" }, loser: { nextId: "8de-a-m10", slot: "player1" } },
  "8de-a-m6": { winner: { nextId: "8de-a-m7", slot: "player2" }, loser: { nextId: "8de-a-m11", slot: "player1" } },
  "8de-a-m7": { winner: { nextId: "8de-a-m14", slot: "player1" }, loser: { nextId: "8de-a-m13", slot: "player1" } },
  "8de-a-m8": { winner: { nextId: "8de-a-m10", slot: "player2" } },
  "8de-a-m9": { winner: { nextId: "8de-a-m11", slot: "player2" } },
  "8de-a-m10": { winner: { nextId: "8de-a-m12", slot: "player1" } },
  "8de-a-m11": { winner: { nextId: "8de-a-m12", slot: "player2" } },
  "8de-a-m12": { winner: { nextId: "8de-a-m13", slot: "player2" } },
  "8de-a-m13": { winner: { nextId: "8de-a-m14", slot: "player2" } },
  "8de-a-m15": {},
};

const ROUND_LABEL_8_DE_BA: Record<string, string> = {
  "8de-a-m1": "WB R1", "8de-a-m2": "WB R1", "8de-a-m3": "WB R1", "8de-a-m4": "WB R1",
  "8de-a-m5": "WB R2", "8de-a-m6": "WB R2", "8de-a-m7": "WB Final",
  "8de-a-m8": "LB R1", "8de-a-m9": "LB R1", "8de-a-m10": "LB R2", "8de-a-m11": "LB R2",
  "8de-a-m12": "LB R3", "8de-a-m13": "LB Final", "8de-a-m14": "Grand Final", "8de-a-m15": "Bracket Reset",
};

function make8DeBracketConstants(prefix: string) {
  const ids = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12", "m13", "m14", "m15"] as const;
  const matchIds = ids.map((m) => `${prefix}-${m}`) as unknown as readonly [string, ...string[]];
  const adv: Record<string, { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }> = {};
  ids.forEach((m, i) => {
    const id = `${prefix}-${m}`;
    if (m === "m1") adv[id] = { winner: { nextId: `${prefix}-m5`, slot: "player1" }, loser: { nextId: `${prefix}-m8`, slot: "player1" } };
    else if (m === "m2") adv[id] = { winner: { nextId: `${prefix}-m5`, slot: "player2" }, loser: { nextId: `${prefix}-m8`, slot: "player2" } };
    else if (m === "m3") adv[id] = { winner: { nextId: `${prefix}-m6`, slot: "player1" }, loser: { nextId: `${prefix}-m9`, slot: "player1" } };
    else if (m === "m4") adv[id] = { winner: { nextId: `${prefix}-m6`, slot: "player2" }, loser: { nextId: `${prefix}-m9`, slot: "player2" } };
    else if (m === "m5") adv[id] = { winner: { nextId: `${prefix}-m7`, slot: "player1" }, loser: { nextId: `${prefix}-m10`, slot: "player1" } };
    else if (m === "m6") adv[id] = { winner: { nextId: `${prefix}-m7`, slot: "player2" }, loser: { nextId: `${prefix}-m11`, slot: "player1" } };
    else if (m === "m7") adv[id] = { winner: { nextId: `${prefix}-m14`, slot: "player1" }, loser: { nextId: `${prefix}-m13`, slot: "player1" } };
    else if (m === "m8") adv[id] = { winner: { nextId: `${prefix}-m10`, slot: "player2" } };
    else if (m === "m9") adv[id] = { winner: { nextId: `${prefix}-m11`, slot: "player2" } };
    else if (m === "m10") adv[id] = { winner: { nextId: `${prefix}-m12`, slot: "player1" } };
    else if (m === "m11") adv[id] = { winner: { nextId: `${prefix}-m12`, slot: "player2" } };
    else if (m === "m12") adv[id] = { winner: { nextId: `${prefix}-m13`, slot: "player2" } };
    else if (m === "m13") adv[id] = { winner: { nextId: `${prefix}-m14`, slot: "player2" } };
    else if (m === "m14" || m === "m15") adv[id] = {};
  });
  const roundLabels: Record<string, string> = {};
  ["m1", "m2", "m3", "m4"].forEach((m) => { roundLabels[`${prefix}-${m}`] = "WB R1"; });
  ["m5", "m6"].forEach((m) => { roundLabels[`${prefix}-${m}`] = "WB R2"; });
  roundLabels[`${prefix}-m7`] = "WB Final";
  ["m8", "m9"].forEach((m) => { roundLabels[`${prefix}-${m}`] = "LB R1"; });
  ["m10", "m11"].forEach((m) => { roundLabels[`${prefix}-${m}`] = "LB R2"; });
  roundLabels[`${prefix}-m12`] = "LB R3";
  roundLabels[`${prefix}-m13`] = "LB Final";
  roundLabels[`${prefix}-m14`] = "Grand Final";
  roundLabels[`${prefix}-m15`] = "Bracket Reset";
  return { matchIds, adv, roundLabels };
}
const BRACKET_B = make8DeBracketConstants("8de-b");
const BRACKET_C = make8DeBracketConstants("8de-c");
const BRACKET_D = make8DeBracketConstants("8de-d");

// 8-player single elimination: 7 matches (R1 → Semis → Final)
const MATCH_IDS_8_SE = ["8-se-m1", "8-se-m2", "8-se-m3", "8-se-m4", "8-se-m5", "8-se-m6", "8-se-m7"] as const;
const ADVANCEMENT_8_SE: Record<string, { winner?: { nextId: string; slot: Slot } }> = {
  "8-se-m1": { winner: { nextId: "8-se-m5", slot: "player1" } },
  "8-se-m2": { winner: { nextId: "8-se-m5", slot: "player2" } },
  "8-se-m3": { winner: { nextId: "8-se-m6", slot: "player1" } },
  "8-se-m4": { winner: { nextId: "8-se-m6", slot: "player2" } },
  "8-se-m5": { winner: { nextId: "8-se-m7", slot: "player1" } },
  "8-se-m6": { winner: { nextId: "8-se-m7", slot: "player2" } },
  "8-se-m7": {},
};
const ROUND_LABEL_8_SE: Record<string, string> = {
  "8-se-m1": "R1", "8-se-m2": "R1", "8-se-m3": "R1", "8-se-m4": "R1",
  "8-se-m5": "Semis", "8-se-m6": "Semis", "8-se-m7": "Final",
};

// 4-player double elimination: 7 matches (WB R1, WB Final, LB R1, LB Final, GF, Bracket Reset)
const MATCH_IDS_4_DE = ["4-de-m1", "4-de-m2", "4-de-m3", "4-de-m4", "4-de-m5", "4-de-m6", "4-de-m7"] as const;
const ADVANCEMENT_4_DE: Record<
  string,
  { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }
> = {
  "4-de-m1": { winner: { nextId: "4-de-m3", slot: "player1" }, loser: { nextId: "4-de-m4", slot: "player1" } },
  "4-de-m2": { winner: { nextId: "4-de-m3", slot: "player2" }, loser: { nextId: "4-de-m4", slot: "player2" } },
  "4-de-m3": { winner: { nextId: "4-de-m6", slot: "player1" }, loser: { nextId: "4-de-m5", slot: "player1" } },
  "4-de-m4": { winner: { nextId: "4-de-m5", slot: "player2" } },
  "4-de-m5": { winner: { nextId: "4-de-m6", slot: "player2" } },
  "4-de-m6": {}, // Champion or bracket reset m7 filled in code
  "4-de-m7": {},
};
const ROUND_LABEL_4_DE: Record<string, string> = {
  "4-de-m1": "WB R1", "4-de-m2": "WB R1", "4-de-m3": "WB Final",
  "4-de-m4": "LB R1", "4-de-m5": "LB Final", "4-de-m6": "Grand Final", "4-de-m7": "Bracket Reset",
};

// 4-player single elimination: 3 matches (Semis → Final)
const MATCH_IDS_4_SE = ["4-se-m1", "4-se-m2", "4-se-m3"] as const;
const ADVANCEMENT_4_SE: Record<string, { winner?: { nextId: string; slot: Slot } }> = {
  "4-se-m1": { winner: { nextId: "4-se-m3", slot: "player1" } },
  "4-se-m2": { winner: { nextId: "4-se-m3", slot: "player2" } },
  "4-se-m3": {},
};
const ROUND_LABEL_4_SE: Record<string, string> = {
  "4-se-m1": "Semis", "4-se-m2": "Semis", "4-se-m3": "Final",
};

// 16-player single elimination: 15 matches (R1 → QF → SF → Final)
const MATCH_IDS_16_SE = [
  "16-se-m1", "16-se-m2", "16-se-m3", "16-se-m4",
  "16-se-m5", "16-se-m6", "16-se-m7", "16-se-m8",
  "16-se-m9", "16-se-m10", "16-se-m11", "16-se-m12",
  "16-se-m13", "16-se-m14",
  "16-se-m15",
] as const;

const ADVANCEMENT_16_SE: Record<string, { winner?: { nextId: string; slot: Slot } }> = {
  "16-se-m1": { winner: { nextId: "16-se-m9", slot: "player1" } },
  "16-se-m2": { winner: { nextId: "16-se-m9", slot: "player2" } },
  "16-se-m3": { winner: { nextId: "16-se-m10", slot: "player1" } },
  "16-se-m4": { winner: { nextId: "16-se-m10", slot: "player2" } },
  "16-se-m5": { winner: { nextId: "16-se-m11", slot: "player1" } },
  "16-se-m6": { winner: { nextId: "16-se-m11", slot: "player2" } },
  "16-se-m7": { winner: { nextId: "16-se-m12", slot: "player1" } },
  "16-se-m8": { winner: { nextId: "16-se-m12", slot: "player2" } },
  "16-se-m9": { winner: { nextId: "16-se-m13", slot: "player1" } },
  "16-se-m10": { winner: { nextId: "16-se-m13", slot: "player2" } },
  "16-se-m11": { winner: { nextId: "16-se-m14", slot: "player1" } },
  "16-se-m12": { winner: { nextId: "16-se-m14", slot: "player2" } },
  "16-se-m13": { winner: { nextId: "16-se-m15", slot: "player1" } },
  "16-se-m14": { winner: { nextId: "16-se-m15", slot: "player2" } },
  "16-se-m15": {},
};

const ROUND_LABEL_16_SE: Record<string, string> = {
  "16-se-m1": "R1", "16-se-m2": "R1", "16-se-m3": "R1", "16-se-m4": "R1",
  "16-se-m5": "R1", "16-se-m6": "R1", "16-se-m7": "R1", "16-se-m8": "R1",
  "16-se-m9": "QF", "16-se-m10": "QF", "16-se-m11": "QF", "16-se-m12": "QF",
  "16-se-m13": "SF", "16-se-m14": "SF",
  "16-se-m15": "Final",
};

const MATCH_IDS_10_DE_BA = Array.from({ length: 31 }, (_, i) => `10de-a-${i + 1}`);

// --- 10-double tab: 8 / 9 / 10 players (determined at Start) ---
// 8 players: same as 8DE, prefix 10de-8 (15 matches)
const MATCH_IDS_10DE_8 = ["10de-8-m1", "10de-8-m2", "10de-8-m3", "10de-8-m4", "10de-8-m5", "10de-8-m6", "10de-8-m7", "10de-8-m8", "10de-8-m9", "10de-8-m10", "10de-8-m11", "10de-8-m12", "10de-8-m13", "10de-8-m14", "10de-8-m15"] as const;
const ADVANCEMENT_10DE_8: Record<string, { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }> = {
  "10de-8-m1": { winner: { nextId: "10de-8-m5", slot: "player1" }, loser: { nextId: "10de-8-m8", slot: "player1" } },
  "10de-8-m2": { winner: { nextId: "10de-8-m5", slot: "player2" }, loser: { nextId: "10de-8-m8", slot: "player2" } },
  "10de-8-m3": { winner: { nextId: "10de-8-m6", slot: "player1" }, loser: { nextId: "10de-8-m9", slot: "player1" } },
  "10de-8-m4": { winner: { nextId: "10de-8-m6", slot: "player2" }, loser: { nextId: "10de-8-m9", slot: "player2" } },
  "10de-8-m5": { winner: { nextId: "10de-8-m7", slot: "player1" }, loser: { nextId: "10de-8-m10", slot: "player1" } },
  "10de-8-m6": { winner: { nextId: "10de-8-m7", slot: "player2" }, loser: { nextId: "10de-8-m11", slot: "player1" } },
  "10de-8-m7": { winner: { nextId: "10de-8-m14", slot: "player1" }, loser: { nextId: "10de-8-m13", slot: "player1" } },
  "10de-8-m8": { winner: { nextId: "10de-8-m10", slot: "player2" } },
  "10de-8-m9": { winner: { nextId: "10de-8-m11", slot: "player2" } },
  "10de-8-m10": { winner: { nextId: "10de-8-m12", slot: "player1" } },
  "10de-8-m11": { winner: { nextId: "10de-8-m12", slot: "player2" } },
  "10de-8-m12": { winner: { nextId: "10de-8-m13", slot: "player2" } },
  "10de-8-m13": { winner: { nextId: "10de-8-m14", slot: "player2" } },
  "10de-8-m14": {},
  "10de-8-m15": {},
};
const ROUND_LABEL_10DE_8: Record<string, string> = {
  "10de-8-m1": "WB R1", "10de-8-m2": "WB R1", "10de-8-m3": "WB R1", "10de-8-m4": "WB R1",
  "10de-8-m5": "WB R2", "10de-8-m6": "WB R2", "10de-8-m7": "WB Final",
  "10de-8-m8": "LB R1", "10de-8-m9": "LB R1", "10de-8-m10": "LB R2", "10de-8-m11": "LB R2",
  "10de-8-m12": "LB R3", "10de-8-m13": "LB Final", "10de-8-m14": "Grand Final", "10de-8-m15": "Bracket Reset",
};

// 9 players: 1 qualy (q1) + 8 main (m1..m15; m4 has bye for q1 winner)
const MATCH_IDS_10DE_9 = ["10de-9-q1", "10de-9-m1", "10de-9-m2", "10de-9-m3", "10de-9-m4", "10de-9-m5", "10de-9-m6", "10de-9-m7", "10de-9-m8", "10de-9-m9", "10de-9-m10", "10de-9-m11", "10de-9-m12", "10de-9-m13", "10de-9-m14", "10de-9-m15"] as const;
const ADVANCEMENT_10DE_9: Record<string, { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }> = {
  "10de-9-q1": { winner: { nextId: "10de-9-m4", slot: "player2" }, loser: { nextId: "10de-9-m8", slot: "player1" } },
  "10de-9-m1": { winner: { nextId: "10de-9-m5", slot: "player1" }, loser: { nextId: "10de-9-m8", slot: "player2" } },
  "10de-9-m2": { winner: { nextId: "10de-9-m5", slot: "player2" }, loser: { nextId: "10de-9-m9", slot: "player1" } },
  "10de-9-m3": { winner: { nextId: "10de-9-m6", slot: "player1" }, loser: { nextId: "10de-9-m9", slot: "player2" } },
  "10de-9-m4": { winner: { nextId: "10de-9-m6", slot: "player2" }, loser: { nextId: "10de-9-m11", slot: "player1" } },
  "10de-9-m5": { winner: { nextId: "10de-9-m7", slot: "player1" }, loser: { nextId: "10de-9-m11", slot: "player2" } },
  "10de-9-m6": { winner: { nextId: "10de-9-m7", slot: "player2" }, loser: { nextId: "10de-9-m13", slot: "player1" } },
  "10de-9-m7": { winner: { nextId: "10de-9-m14", slot: "player1" }, loser: { nextId: "10de-9-m13", slot: "player2" } },
  "10de-9-m8": { winner: { nextId: "10de-9-m10", slot: "player1" } },
  "10de-9-m9": { winner: { nextId: "10de-9-m10", slot: "player2" } },
  "10de-9-m10": { winner: { nextId: "10de-9-m12", slot: "player1" } },
  "10de-9-m11": { winner: { nextId: "10de-9-m12", slot: "player2" } },
  "10de-9-m12": { winner: { nextId: "10de-9-m13", slot: "player1" } },
  "10de-9-m13": { winner: { nextId: "10de-9-m14", slot: "player2" } },
  "10de-9-m14": {},
  "10de-9-m15": {},
};
const ROUND_LABEL_10DE_9: Record<string, string> = {
  "10de-9-q1": "Qualy R1",
  "10de-9-m1": "WB R1", "10de-9-m2": "WB R1", "10de-9-m3": "WB R1", "10de-9-m4": "WB R1",
  "10de-9-m5": "WB R2", "10de-9-m6": "WB R2", "10de-9-m7": "WB Final",
  "10de-9-m8": "LB R1", "10de-9-m9": "LB R1", "10de-9-m10": "LB R2", "10de-9-m11": "LB R2",
  "10de-9-m12": "LB R3", "10de-9-m13": "LB Final", "10de-9-m14": "Grand Final", "10de-9-m15": "Bracket Reset",
};

// 10 players: 2 qualy (q1, q2) + 8 main (m1..m16; m3/m4 have byes for q1/q2 winners)
const MATCH_IDS_10DE_10 = ["10de-10-q1", "10de-10-q2", "10de-10-m1", "10de-10-m2", "10de-10-m3", "10de-10-m4", "10de-10-m5", "10de-10-m6", "10de-10-m7", "10de-10-m8", "10de-10-m9", "10de-10-m10", "10de-10-m11", "10de-10-m12", "10de-10-m13", "10de-10-m14", "10de-10-m15", "10de-10-m16", "10de-10-m17"] as const;
const ADVANCEMENT_10DE_10: Record<string, { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }> = {
  "10de-10-q1": { winner: { nextId: "10de-10-m3", slot: "player2" }, loser: { nextId: "10de-10-m8", slot: "player1" } },
  "10de-10-q2": { winner: { nextId: "10de-10-m4", slot: "player2" }, loser: { nextId: "10de-10-m9", slot: "player1" } },
  "10de-10-m1": { winner: { nextId: "10de-10-m5", slot: "player1" }, loser: { nextId: "10de-10-m8", slot: "player2" } },
  "10de-10-m2": { winner: { nextId: "10de-10-m5", slot: "player2" }, loser: { nextId: "10de-10-m9", slot: "player2" } },
  "10de-10-m3": { winner: { nextId: "10de-10-m6", slot: "player1" }, loser: { nextId: "10de-10-m10", slot: "player2" } },
  "10de-10-m4": { winner: { nextId: "10de-10-m6", slot: "player2" }, loser: { nextId: "10de-10-m11", slot: "player2" } },
  "10de-10-m5": { winner: { nextId: "10de-10-m7", slot: "player1" }, loser: { nextId: "10de-10-m12", slot: "player2" } },
  "10de-10-m6": { winner: { nextId: "10de-10-m7", slot: "player2" }, loser: { nextId: "10de-10-m13", slot: "player2" } },
  "10de-10-m7": { winner: { nextId: "10de-10-m16", slot: "player1" }, loser: { nextId: "10de-10-m15", slot: "player2" } },
  "10de-10-m8": { winner: { nextId: "10de-10-m10", slot: "player1" } },
  "10de-10-m9": { winner: { nextId: "10de-10-m11", slot: "player1" } },
  "10de-10-m10": { winner: { nextId: "10de-10-m12", slot: "player1" } },
  "10de-10-m11": { winner: { nextId: "10de-10-m13", slot: "player1" } },
  "10de-10-m12": { winner: { nextId: "10de-10-m14", slot: "player1" } },
  "10de-10-m13": { winner: { nextId: "10de-10-m14", slot: "player2" } },
  "10de-10-m14": { winner: { nextId: "10de-10-m15", slot: "player1" } },
  "10de-10-m15": { winner: { nextId: "10de-10-m16", slot: "player2" } },
  "10de-10-m16": {},
  "10de-10-m17": {},
};
const ROUND_LABEL_10DE_10: Record<string, string> = {
  "10de-10-q1": "Qualy R1", "10de-10-q2": "Qualy R1",
  "10de-10-m1": "WB R1", "10de-10-m2": "WB R1", "10de-10-m3": "WB R1", "10de-10-m4": "WB R1",
  "10de-10-m5": "WB R2", "10de-10-m6": "WB R2", "10de-10-m7": "WB Final",
  "10de-10-m8": "LB R1", "10de-10-m9": "LB R1",
  "10de-10-m10": "LB R2", "10de-10-m11": "LB R2",
  "10de-10-m12": "LB R3", "10de-10-m13": "LB R3",
  "10de-10-m14": "LB R4", "10de-10-m15": "LB Final",
  "10de-10-m16": "Grand Final", "10de-10-m17": "Bracket Reset",
};

function getFlex10MatchIds(playerCount: Flex10PlayerCount): readonly string[] {
  if (playerCount === 8) return MATCH_IDS_10DE_8;
  if (playerCount === 9) return MATCH_IDS_10DE_9;
  return MATCH_IDS_10DE_10;
}

function getFlex10RoundLabel(playerCount: Flex10PlayerCount, id: string): string {
  if (playerCount === 8) return ROUND_LABEL_10DE_8[id] ?? "—";
  if (playerCount === 9) return ROUND_LABEL_10DE_9[id] ?? "—";
  return ROUND_LABEL_10DE_10[id] ?? "—";
}

function getFlex10Bracket(playerCount: Flex10PlayerCount, id: string): "winners" | "losers" {
  if (playerCount === 8) return (MATCH_IDS_10DE_8 as readonly string[]).indexOf(id) < 7 ? "winners" : "losers";
  if (playerCount === 9) return (["10de-9-q1", "10de-9-m1", "10de-9-m2", "10de-9-m3", "10de-9-m4", "10de-9-m5", "10de-9-m6", "10de-9-m7"].includes(id)) ? "winners" : "losers";
  return (["10de-10-q1", "10de-10-q2", "10de-10-m1", "10de-10-m2", "10de-10-m3", "10de-10-m4", "10de-10-m5", "10de-10-m6", "10de-10-m7"].includes(id)) ? "winners" : "losers";
}

function seedFlex10Bracket(
  playerCount: Flex10PlayerCount,
  entryPlayerIds: string[],
  players: Player[],
): Match[] {
  const getPlayer = (id: string) => players.find((p) => p.id === id);
  const ids = getFlex10MatchIds(playerCount);
  const roundLabel = (id: string) => getFlex10RoundLabel(playerCount, id);
  const bracket = (id: string) => getFlex10Bracket(playerCount, id);
  const baseMatch = (id: string, i: number): Match => ({
    id,
    matchNumber: `M${i + 1}`,
    score1: 0,
    score2: 0,
    raceTo: 5,
    status: "pending" as const,
    round: roundLabel(id),
    bracket: bracket(id),
  });
  const matches: Match[] = ids.map((id, i) => ({ ...baseMatch(id, i) }));

  const setSlot = (matchId: string, slot: "player1" | "player2", playerId: string) => {
    const m = matches.find((x) => x.id === matchId);
    const p = getPlayer(playerId);
    if (m && p) m[slot] = p;
  };

  if (playerCount === 8) {
    setSlot("10de-8-m1", "player1", entryPlayerIds[0]);
    setSlot("10de-8-m1", "player2", entryPlayerIds[1]);
    setSlot("10de-8-m2", "player1", entryPlayerIds[2]);
    setSlot("10de-8-m2", "player2", entryPlayerIds[3]);
    setSlot("10de-8-m3", "player1", entryPlayerIds[4]);
    setSlot("10de-8-m3", "player2", entryPlayerIds[5]);
    setSlot("10de-8-m4", "player1", entryPlayerIds[6]);
    setSlot("10de-8-m4", "player2", entryPlayerIds[7]);
  } else if (playerCount === 9) {
    setSlot("10de-9-q1", "player1", entryPlayerIds[0]);
    setSlot("10de-9-q1", "player2", entryPlayerIds[1]);
    setSlot("10de-9-m1", "player1", entryPlayerIds[2]);
    setSlot("10de-9-m1", "player2", entryPlayerIds[3]);
    setSlot("10de-9-m2", "player1", entryPlayerIds[4]);
    setSlot("10de-9-m2", "player2", entryPlayerIds[5]);
    setSlot("10de-9-m3", "player1", entryPlayerIds[6]);
    setSlot("10de-9-m3", "player2", entryPlayerIds[7]);
    setSlot("10de-9-m4", "player1", entryPlayerIds[8]);
    // m4 player2 = bye (filled by q1 winner)
  } else {
    setSlot("10de-10-q1", "player1", entryPlayerIds[0]);
    setSlot("10de-10-q1", "player2", entryPlayerIds[1]);
    setSlot("10de-10-q2", "player1", entryPlayerIds[2]);
    setSlot("10de-10-q2", "player2", entryPlayerIds[3]);
    setSlot("10de-10-m1", "player1", entryPlayerIds[4]);
    setSlot("10de-10-m1", "player2", entryPlayerIds[5]);
    setSlot("10de-10-m2", "player1", entryPlayerIds[6]);
    setSlot("10de-10-m2", "player2", entryPlayerIds[7]);
    setSlot("10de-10-m3", "player1", entryPlayerIds[8]);
    setSlot("10de-10-m4", "player1", entryPlayerIds[9]);
    // m3/m4 player2 = bye (filled by q1/q2 winners)
  }
  return matches;
}

const InvitationalPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showLimitReachedModal } = useUsage();
  const canEdit = !!user; // Both manager and user roles get full access to Invitational

  const activeTab = useMemo((): InvitationalTab => {
    const t = searchParams.get("tab");
    if (t === "8-double" || t === "8-double-bracket-a" || t === "8-double-bracket-b" || t === "8-double-bracket-c" || t === "8-double-bracket-d" || t === "10-double" || t === "8-single" || t === "4-double" || t === "4-single" || t === "16-single") return t;
    return DEFAULT_TAB;
  }, [searchParams]);

  const setActiveTab = useCallback(
    (tab: InvitationalTab) => {
      router.replace("/invitational?tab=" + tab);
    },
    [router]
  );

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>("");
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>("");
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);
  const [raceTo, setRaceTo] = useState<number>(5);
  const [playerSearch, setPlayerSearch] = useState<string>("");
  // Winner confirmation: when increment would reach raceTo and win, show popup before applying
  const [showWinnerConfirm, setShowWinnerConfirm] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<"player1" | "player2" | null>(null);
  // Reset tournament confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Tournament winner modal (champion + receipt)
  const [showTournamentWinnerModal, setShowTournamentWinnerModal] = useState(false);

  // 10-double tab: 8/9/10 players determined at Start
  const [flex10Config, setFlex10Config] = useState<{ started: boolean; playerCount: Flex10PlayerCount | null }>({ started: false, playerCount: null });
  const [flex10EntrySlots, setFlex10EntrySlots] = useState<(string | null)[]>(Array(10).fill(null));

  const getMatchIdsForTab = useCallback((tab: InvitationalTab, overrideFlexCount?: Flex10PlayerCount | null): readonly string[] => {
    if (tab === "8-double") return MATCH_IDS_8_DE;
    if (tab === "8-double-bracket-a") return MATCH_IDS_8_DE_BA;
    if (tab === "8-double-bracket-b") return BRACKET_B.matchIds;
    if (tab === "8-double-bracket-c") return BRACKET_C.matchIds;
    if (tab === "8-double-bracket-d") return BRACKET_D.matchIds;
    if (tab === "10-double-bracket-a") return MATCH_IDS_10_DE_BA;
    if (tab === "10-double") {
      const count = overrideFlexCount ?? flex10Config.playerCount;
      if (!flex10Config.started || count === null) return [];
      return getFlex10MatchIds(count);
    }
    if (tab === "8-single") return MATCH_IDS_8_SE;
    if (tab === "4-double") return MATCH_IDS_4_DE;
    if (tab === "4-single") return MATCH_IDS_4_SE;
    if (tab === "16-single") return MATCH_IDS_16_SE;
    return [];
  }, [flex10Config]);

  const getRoundLabel = useCallback((tab: InvitationalTab, id: string): string => {
    if (tab === "8-double") return ROUND_LABEL_8_DE[id] ?? "—";
    if (tab === "8-double-bracket-a") return ROUND_LABEL_8_DE_BA[id] ?? "—";
    if (tab === "8-double-bracket-b") return BRACKET_B.roundLabels[id] ?? "—";
    if (tab === "8-double-bracket-c") return BRACKET_C.roundLabels[id] ?? "—";
    if (tab === "8-double-bracket-d") return BRACKET_D.roundLabels[id] ?? "—";
    if (tab === "10-double-bracket-a") {
      const num = parseInt(id.replace(/\D/g, ''));
      if (num <= 8) return "WB R1";
      if (num <= 12) return "WB R2";
      if (num <= 16) return "LB R1";
      if (num <= 20) return "LB R2";
      if (num <= 22) return "WB R3";
      if (num <= 24) return "LB R3";
      if (num <= 26) return "LB R4";
      if (num === 27) return "WB Final";
      if (num === 28) return "LB R5";
      if (num === 29) return "LB Final";
      if (num === 30) return "Grand Final";
      if (num === 31) return "Bracket Reset";
      return "—";
    }
    if (tab === "10-double" && flex10Config.playerCount === 8) return ROUND_LABEL_10DE_8[id] ?? "—";
    if (tab === "10-double" && flex10Config.playerCount === 9) return ROUND_LABEL_10DE_9[id] ?? "—";
    if (tab === "10-double" && flex10Config.playerCount === 10) return ROUND_LABEL_10DE_10[id] ?? "—";
    if (tab === "8-single") return ROUND_LABEL_8_SE[id] ?? "—";
    if (tab === "4-double") return ROUND_LABEL_4_DE[id] ?? "—";
    if (tab === "4-single") return ROUND_LABEL_4_SE[id] ?? "—";
    if (tab === "16-single") return ROUND_LABEL_16_SE[id] ?? "—";
    return "—";
  }, [flex10Config.playerCount]);

  const getBracketForTab = useCallback((tab: InvitationalTab, id: string): "winners" | "losers" => {
    if (tab === "8-double") return (MATCH_IDS_8_DE.indexOf(id as (typeof MATCH_IDS_8_DE)[number]) < 7) ? "winners" : "losers";
    if (tab === "8-double-bracket-a") return (MATCH_IDS_8_DE_BA.indexOf(id as (typeof MATCH_IDS_8_DE_BA)[number]) < 7) ? "winners" : "losers";
    if (tab === "8-double-bracket-b") return (BRACKET_B.matchIds.indexOf(id) < 7) ? "winners" : "losers";
    if (tab === "8-double-bracket-c") return (BRACKET_C.matchIds.indexOf(id) < 7) ? "winners" : "losers";
    if (tab === "8-double-bracket-d") return (BRACKET_D.matchIds.indexOf(id) < 7) ? "winners" : "losers";
    if (tab === "10-double-bracket-a") {
      const num = parseInt(id.replace(/\D/g, ''));
      if (num >= 13 && num <= 20) return "losers";
      if (num >= 23 && num <= 26) return "losers";
      if (num === 28 || num === 29) return "losers";
      return "winners";
    }
    if (tab === "10-double" && flex10Config.playerCount === 8) return (MATCH_IDS_10DE_8.indexOf(id as (typeof MATCH_IDS_10DE_8)[number]) < 7) ? "winners" : "losers";
    if (tab === "10-double" && flex10Config.playerCount === 9) return (["10de-9-q1", "10de-9-m1", "10de-9-m2", "10de-9-m3", "10de-9-m4", "10de-9-m5", "10de-9-m6", "10de-9-m7"].includes(id)) ? "winners" : "losers";
    if (tab === "10-double" && flex10Config.playerCount === 10) return (["10de-10-q1", "10de-10-q2", "10de-10-m1", "10de-10-m2", "10de-10-m3", "10de-10-m4", "10de-10-m5", "10de-10-m6", "10de-10-m7"].includes(id)) ? "winners" : "losers";
    if (tab === "8-single") return "winners";
    if (tab === "4-double") return (["4-de-m1", "4-de-m2", "4-de-m3"].includes(id)) ? "winners" : "losers";
    if (tab === "4-single") return "winners";
    if (tab === "16-single") return "winners";
    return "winners";
  }, [flex10Config.playerCount]);

  const initializeMatches = useCallback(
    async (tab: InvitationalTab) => {
      const ids = getMatchIdsForTab(tab);
      if (ids.length === 0) return;
      console.log(`Initializing ${tab} matches (${ids.length})...`);
      const allMatches: Match[] = ids.map((id, i) => ({
        id,
        matchNumber: `M${i + 1}`,
        score1: 0,
        score2: 0,
        raceTo: 5,
        status: "pending" as const,
        round: getRoundLabel(tab, id),
        bracket: getBracketForTab(tab, id),
      }));
      setMatches(allMatches);
      try {
        const matchesRef = collection(db, "matches");
        for (const match of allMatches) {
          await setDoc(doc(matchesRef, match.id), match);
        }
        console.log(`${tab} matches saved to Firebase.`);
      } catch (error) {
        console.error("Error saving matches to Firebase:", error);
      }
    },
    [getMatchIdsForTab, getRoundLabel, getBracketForTab]
  );

  // Load players and matches from Firebase
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    console.log("useEffect triggered - loading data...");
    const loadData = async () => {
      try {
        console.log("Loading players from Firebase...");
        // Load players
        const playersSnapshot = await getDocs(collection(db, "players"));
        const playersData = playersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Player[];
        console.log("Loaded players:", playersData.length);
        setPlayers(playersData);

        // 10-double: load config first so we know player count and started state
        let flex10Loaded: { started: boolean; playerCount: Flex10PlayerCount | null } = { started: false, playerCount: null };
        if (activeTab === "10-double") {
          const configSnap = await getDoc(doc(db, "config", "invitational_10double"));
          const d = configSnap.data();
          flex10Loaded = {
            started: !!d?.started,
            playerCount: (d?.playerCount === 8 || d?.playerCount === 9 || d?.playerCount === 10) ? d.playerCount : null,
          };
          setFlex10Config(flex10Loaded);
        }

        console.log("Checking for existing matches in Firebase...");
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        const raw = matchesSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Match[];

        const ids = activeTab === "10-double"
          ? (flex10Loaded.started && flex10Loaded.playerCount ? getFlex10MatchIds(flex10Loaded.playerCount) : [])
          : getMatchIdsForTab(activeTab);
        if (ids.length > 0) {
          const normalized: Match[] = ids.map((id, i) => {
            const existing = raw.find((m) => m.id === id);
            if (existing) {
              if (existing.raceTo === 9) return { ...existing, raceTo: 5 };
              return existing;
            }
            return {
              id,
              matchNumber: `M${i + 1}`,
              score1: 0,
              score2: 0,
              raceTo: 5,
              status: "pending" as const,
              round: getRoundLabel(activeTab, id),
              bracket: getBracketForTab(activeTab, id),
            };
          });
          const hasAny = raw.some((m) => ids.includes(m.id));
          if (!hasAny && canEdit) {
            console.log(`No ${activeTab} matches, initializing...`);
            await initializeMatches(activeTab);
          } else {
            setMatches(normalized);
          }
        } else {
          setMatches([]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        console.error("Full error details:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [initializeMatches, canEdit, authLoading, activeTab, getMatchIdsForTab, getRoundLabel, getBracketForTab]);

  useEffect(() => {
    if (authLoading || loading) return;

    const checkAndInitialize = async () => {
      if (!canEdit) return;
      const ids = getMatchIdsForTab(activeTab);
      if (ids.length === 0) return;
      try {
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        const hasAny = matchesSnapshot.docs.some((d) => ids.includes(d.id));
        if (!hasAny && matches.length === 0 && players.length > 0) {
          console.log(`Manager logged in, initializing ${activeTab} now...`);
          await initializeMatches(activeTab);
        }
      } catch (error) {
        console.error("Error checking matches after login:", error);
      }
    };

    checkAndInitialize();
  }, [canEdit, authLoading, loading, activeTab, matches.length, players.length, initializeMatches, getMatchIdsForTab]);

  // Handle match click
  const handleMatchClick = (matchId: string) => {
    if (!canEdit) {
      alert("Please log in to edit matches.");
      return;
    }
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      setSelectedMatch(match);
      setSelectedPlayer1(match.player1?.id || "");
      setSelectedPlayer2(match.player2?.id || "");
      setScore1(match.score1);
      setScore2(match.score2);
      setRaceTo(match.raceTo);
      setShowWinnerConfirm(false);
      setPendingWinner(null);
      setIsModalOpen(true);
    }
  };

  // Get match by ID
  const getMatchById = (matchId: string) => {
    return matches.find((m) => m.id === matchId);
  };

  // Sync 4 Double Grand Final (4-de-m6) to Tour Manager overlay (allows missing players)
  const syncM6ToTourManager = async (m6: Match | undefined) => {
    try {
      await setDoc(
        doc(db, "current_match", TOUR_MANAGER_MATCH_ID),
        {
          player1Id: m6?.player1?.id ?? "",
          player2Id: m6?.player2?.id ?? "",
          player1Name: m6?.player1?.name ?? "TBD",
          player2Name: m6?.player2?.name ?? "TBD",
          player1PhotoURL: m6?.player1?.photoURL ?? "",
          player2PhotoURL: m6?.player2?.photoURL ?? "",
          player1Score: m6?.score1 ?? 0,
          player2Score: m6?.score2 ?? 0,
          raceTo: m6?.raceTo ?? 5,
          currentTurn: null,
          pocketedBalls: [],
          gameMode: "9-ball",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error syncing Tour Manager:", e);
      throw e;
    }
  };

  const handleUpdateTourManager = async () => {
    if (activeTab !== "4-double") return;
    const m6 = matches.find((m) => m.id === FOUR_DOUBLE_GRAND_FINAL_ID);
    try {
      await syncM6ToTourManager(m6);
      alert("Tour Manager updated with Grand Final match.");
    } catch {
      alert("Failed to update Tour Manager. Check console.");
    }
  };

  // Score increment: cap at raceTo; if this point would win, show confirmation first
  const handleIncrementScore1 = () => {
    if (score1 >= raceTo) return;
    const next = score1 + 1;
    if (next === raceTo && next > score2) {
      setPendingWinner("player1");
      setShowWinnerConfirm(true);
      return;
    }
    setScore1(next);
  };
  const handleIncrementScore2 = () => {
    if (score2 >= raceTo) return;
    const next = score2 + 1;
    if (next === raceTo && next > score1) {
      setPendingWinner("player2");
      setShowWinnerConfirm(true);
      return;
    }
    setScore2(next);
  };
  const handleDecrementScore1 = () => {
    setScore1(Math.max(0, score1 - 1));
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };
  const handleDecrementScore2 = () => {
    setScore2(Math.max(0, score2 - 1));
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };
  const confirmWinner = () => {
    if (pendingWinner === "player1") setScore1(raceTo);
    if (pendingWinner === "player2") setScore2(raceTo);
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };
  const cancelWinnerConfirm = () => {
    setShowWinnerConfirm(false);
    setPendingWinner(null);
  };

  const renderMatchBox = (matchId: string, isLosers: boolean, wide = false) => {
    const match = getMatchById(matchId);
    const winner = match?.winner;
    const hover = isLosers ? "hover:border-red-500" : "hover:border-blue-500";
    return (
      <div
        key={matchId}
        className={`${
          wide ? "w-[19.6rem] h-[4.4rem]" : "w-40 h-16"
        } border-2 ${wide ? "border-slate-600 bg-slate-800" : "border-slate-500 bg-slate-100"} rounded-lg ${
          wide ? "px-1" : "px-2"
        } py-px cursor-pointer ${hover} hover:shadow-md transition-all`}
        onClick={() => handleMatchClick(matchId)}
      >
        <div className={`grid ${wide ? "grid-cols-[0.5fr_2.6fr_0.5fr]" : "grid-cols-[1fr_3fr_1fr]"} gap-2 h-full`}>
          <div className="flex items-center justify-center border-r border-gray-400">
            <div
              className={`font-medium ${wide ? "text-base text-slate-100" : "text-sm text-slate-700"}`}
            >
              {match?.matchNumber ?? matchId}
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-0 border-r border-gray-400">
            <div
              className={`text-center border-b border-gray-600 pb-1 font-medium ${
                wide ? "text-lg" : "text-base"
              } ${
                winner === "player1"
                  ? wide
                    ? "bg-emerald-700/70 text-slate-50 font-bold"
                    : "bg-emerald-100 text-emerald-900 font-bold"
                  : wide
                  ? "text-slate-100"
                  : "text-slate-800"
              }`}
            >
              {match?.player1?.name ?? "TBD"}
            </div>
            <div
              className={`text-center pt-1 font-medium ${
                wide ? "text-lg" : "text-base"
              } ${
                winner === "player2"
                  ? wide
                    ? "bg-emerald-700/70 text-slate-50 font-bold"
                    : "bg-emerald-100 text-emerald-900 font-bold"
                  : wide
                  ? "text-slate-100"
                  : "text-slate-800"
              }`}
            >
              {match?.player2?.name ?? "TBD"}
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-0">
            <div
              className={`font-bold text-center border-b border-gray-600 pb-1 ${
                wide ? "text-lg" : "text-base"
              } ${
                winner === "player1"
                  ? wide
                    ? "bg-emerald-700/70 text-slate-50"
                    : "bg-emerald-100 text-emerald-900"
                  : wide
                  ? "text-slate-100"
                  : "text-slate-800"
              }`}
            >
              {match?.score1 ?? "-"}
            </div>
            <div
              className={`font-bold text-center pt-1 ${
                wide ? "text-lg" : "text-base"
              } ${
                winner === "player2"
                  ? wide
                    ? "bg-emerald-700/70 text-slate-50"
                    : "bg-emerald-100 text-emerald-900"
                  : wide
                  ? "text-slate-100"
                  : "text-slate-800"
              }`}
            >
              {match?.score2 ?? "-"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Save match data
  const handleSaveMatch = async () => {
    if (!selectedMatch) return;

    if (!canEdit) {
      alert("Please log in to update matches.");
      return;
    }

    const player1 = players.find((p) => p.id === selectedPlayer1);
    const player2 = players.find((p) => p.id === selectedPlayer2);

    // Determine winner based on race to target
    let winner: "player1" | "player2" | undefined = undefined;
    let isCompleted = false;

    if (player1 && player2) {
      if (score1 >= raceTo && score1 > score2) {
        winner = "player1";
        isCompleted = true;
      } else if (score2 >= raceTo && score2 > score1) {
        winner = "player2";
        isCompleted = true;
      }
    }

    const updatedMatch: Match = {
      ...selectedMatch,
      player1: player1 || undefined,
      player2: player2 || undefined,
      score1: score1,
      score2: score2,
      raceTo: raceTo,
      winner: winner,
      status: isCompleted
        ? "completed"
        : player1 && player2
        ? "in_progress"
        : "pending",
    };

    let nextMatches = matches.map((match) =>
      match.id === selectedMatch.id ? updatedMatch : match
    );

    // Save current match to Firebase (merge so doc is created if missing)
    try {
      const matchRef = doc(db, "matches", selectedMatch.id);
      await setDoc(
        matchRef,
        {
          ...updatedMatch,
          player1: player1 ?? null,
          player2: player2 ?? null,
          winner: winner ?? null,
        },
        { merge: true }
      );
    } catch (error) {
      if ((error as { code?: string })?.code === "permission-denied") {
        showLimitReachedModal();
      }
      console.error("Error saving match to Firebase:", error);
      setIsModalOpen(false);
      return;
    }

    const setNextMatchSlot = (matchId: string, slot: Slot, player: Player) => {
      const idx = nextMatches.findIndex((m) => m.id === matchId);
      if (idx === -1) return;
      const m = { ...nextMatches[idx] };
      if (slot === "player1") m.player1 = player;
      else m.player2 = player;
      nextMatches = nextMatches.slice(0, idx).concat(m, nextMatches.slice(idx + 1));
    };

    const persistMatches = async (updatedIds: Set<string>) => {
      for (const id of updatedIds) {
        const m = nextMatches.find((x) => x.id === id);
        if (m) {
          try {
            await updateDoc(doc(db, "matches", id), {
              player1: m.player1 ?? null,
              player2: m.player2 ?? null,
            });
          } catch (e) {
            if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
            else console.error(`Error updating match ${id}:`, e);
          }
        }
      }
    };

    if (isCompleted && player1 && player2 && activeTab === "8-double") {
      const adv = ADVANCEMENT_8_DE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const loserPlayer = winner === "player1" ? player2 : player1;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
        updatedIds.add(adv.loser.nextId);
      }
      if (selectedMatch.id === "8-de-m14") {
        const m13 = nextMatches.find((m) => m.id === "8-de-m13");
        const lbChampion =
          m13?.winner && m13.player1 && m13.player2
            ? m13.winner === "player1" ? m13.player1 : m13.player2
            : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const m15Idx = nextMatches.findIndex((m) => m.id === "8-de-m15");
          if (m15Idx !== -1) {
            const m15 = { ...nextMatches[m15Idx], player1: updatedMatch.player1, player2: updatedMatch.player2 };
            nextMatches = nextMatches.slice(0, m15Idx).concat(m15, nextMatches.slice(m15Idx + 1));
            try {
              await updateDoc(doc(db, "matches", "8-de-m15"), {
                player1: updatedMatch.player1 ?? null,
                player2: updatedMatch.player2 ?? null,
              });
            } catch (e) {
              if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
              else console.error("Error filling M15:", e);
            }
          }
        }
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "8-double-bracket-a") {
      const adv = ADVANCEMENT_8_DE_BA[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const loserPlayer = winner === "player1" ? player2 : player1;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
        updatedIds.add(adv.loser.nextId);
      }
      if (selectedMatch.id === "8de-a-m14") {
        const m13 = nextMatches.find((m) => m.id === "8de-a-m13");
        const lbChampion =
          m13?.winner && m13.player1 && m13.player2
            ? m13.winner === "player1" ? m13.player1 : m13.player2
            : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const m15Idx = nextMatches.findIndex((m) => m.id === "8de-a-m15");
          if (m15Idx !== -1) {
            const m15 = { ...nextMatches[m15Idx], player1: updatedMatch.player1, player2: updatedMatch.player2 };
            nextMatches = nextMatches.slice(0, m15Idx).concat(m15, nextMatches.slice(m15Idx + 1));
            try {
              await updateDoc(doc(db, "matches", "8de-a-m15"), {
                player1: updatedMatch.player1 ?? null,
                player2: updatedMatch.player2 ?? null,
              });
            } catch (e) {
              if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
              else console.error("Error filling 8de-a-m15:", e);
            }
          }
        }
      }
      await persistMatches(updatedIds);
    }

    const run8DeBracketAdvancement = async (prefix: string, advMap: Record<string, { winner?: { nextId: string; slot: Slot }; loser?: { nextId: string; slot: Slot } }>) => {
      const adv = advMap[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1! : player2!;
      const loserPlayer = winner === "player1" ? player2! : player1!;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
        updatedIds.add(adv.loser.nextId);
      }
      if (selectedMatch.id === `${prefix}-m14`) {
        const m13 = nextMatches.find((m) => m.id === `${prefix}-m13`);
        const lbChampion = m13?.winner && m13.player1 && m13.player2 ? (m13.winner === "player1" ? m13.player1 : m13.player2) : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const m15Idx = nextMatches.findIndex((m) => m.id === `${prefix}-m15`);
          if (m15Idx !== -1) {
            const m15 = { ...nextMatches[m15Idx], player1: updatedMatch.player1, player2: updatedMatch.player2 };
            nextMatches = nextMatches.slice(0, m15Idx).concat(m15, nextMatches.slice(m15Idx + 1));
            try {
              await updateDoc(doc(db, "matches", `${prefix}-m15`), { player1: updatedMatch.player1 ?? null, player2: updatedMatch.player2 ?? null });
            } catch (e) {
              if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
              else console.error(`Error filling ${prefix}-m15:`, e);
            }
          }
        }
      }
      await persistMatches(updatedIds);
    };
    if (isCompleted && player1 && player2 && activeTab === "8-double-bracket-b") {
      await run8DeBracketAdvancement("8de-b", BRACKET_B.adv);
    }
    if (isCompleted && player1 && player2 && activeTab === "8-double-bracket-c") {
      await run8DeBracketAdvancement("8de-c", BRACKET_C.adv);
    }
    if (isCompleted && player1 && player2 && activeTab === "8-double-bracket-d") {
      await run8DeBracketAdvancement("8de-d", BRACKET_D.adv);
    }

    if (isCompleted && player1 && player2 && activeTab === "10-double" && flex10Config.playerCount) {
      const advMap = flex10Config.playerCount === 8 ? ADVANCEMENT_10DE_8 : flex10Config.playerCount === 9 ? ADVANCEMENT_10DE_9 : ADVANCEMENT_10DE_10;
      const adv = advMap[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1! : player2!;
      const loserPlayer = winner === "player1" ? player2! : player1!;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
        updatedIds.add(adv.loser.nextId);
      }
      const prefix = flex10Config.playerCount === 8 ? "10de-8" : flex10Config.playerCount === 9 ? "10de-9" : "10de-10";
      const gfId = flex10Config.playerCount === 10 ? "10de-10-m16" : `${prefix}-m14`;
      const resetId = flex10Config.playerCount === 10 ? "10de-10-m17" : `${prefix}-m15`;
      const lbFinalId = flex10Config.playerCount === 10 ? "10de-10-m15" : `${prefix}-m13`;
      if (selectedMatch.id === gfId) {
        const lbFinal = nextMatches.find((m) => m.id === lbFinalId);
        const lbChampion = lbFinal?.winner && lbFinal.player1 && lbFinal.player2 ? (lbFinal.winner === "player1" ? lbFinal.player1 : lbFinal.player2) : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const resetIdx = nextMatches.findIndex((m) => m.id === resetId);
          if (resetIdx !== -1) {
            const resetMatch = { ...nextMatches[resetIdx], player1: updatedMatch.player1, player2: updatedMatch.player2 };
            nextMatches = nextMatches.slice(0, resetIdx).concat(resetMatch, nextMatches.slice(resetIdx + 1));
            try {
              await updateDoc(doc(db, "matches", resetId), { player1: updatedMatch.player1 ?? null, player2: updatedMatch.player2 ?? null });
            } catch (e) {
              if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
              else console.error("Error filling bracket reset:", e);
            }
          }
        }
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "8-single") {
      const adv = ADVANCEMENT_8_SE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "16-single") {
      const adv = ADVANCEMENT_16_SE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "4-double") {
      const adv = ADVANCEMENT_4_DE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const loserPlayer = winner === "player1" ? player2 : player1;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      if (adv?.loser) {
        setNextMatchSlot(adv.loser.nextId, adv.loser.slot, loserPlayer);
        updatedIds.add(adv.loser.nextId);
      }
      if (selectedMatch.id === "4-de-m6") {
        const m5 = nextMatches.find((m) => m.id === "4-de-m5");
        const lbChampion = m5?.winner && m5.player1 && m5.player2
          ? (m5.winner === "player1" ? m5.player1 : m5.player2)
          : null;
        if (lbChampion && winnerPlayer.id === lbChampion.id) {
          const m7Idx = nextMatches.findIndex((m) => m.id === "4-de-m7");
          if (m7Idx !== -1) {
            const m7 = { ...nextMatches[m7Idx], player1: updatedMatch.player1, player2: updatedMatch.player2 };
            nextMatches = nextMatches.slice(0, m7Idx).concat(m7, nextMatches.slice(m7Idx + 1));
            try {
              await updateDoc(doc(db, "matches", "4-de-m7"), {
                player1: updatedMatch.player1 ?? null,
                player2: updatedMatch.player2 ?? null,
              });
            } catch (e) {
              if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
              else console.error("Error filling 4-de-m7:", e);
            }
          }
        }
      }
      await persistMatches(updatedIds);
    }

    if (isCompleted && player1 && player2 && activeTab === "4-single") {
      const adv = ADVANCEMENT_4_SE[selectedMatch.id];
      const winnerPlayer = winner === "player1" ? player1 : player2;
      const updatedIds = new Set<string>();
      if (adv?.winner) {
        setNextMatchSlot(adv.winner.nextId, adv.winner.slot, winnerPlayer);
        updatedIds.add(adv.winner.nextId);
      }
      await persistMatches(updatedIds);
    }

    setMatches(nextMatches);
    setIsModalOpen(false);
    // Auto-sync 4 Double Grand Final to Tour Manager whenever matches are saved (including advancement)
    if (activeTab === "4-double") {
      const m6 = nextMatches.find((m) => m.id === FOUR_DOUBLE_GRAND_FINAL_ID);
      syncM6ToTourManager(m6).catch((e) => console.error("Auto-sync Tour Manager:", e));
    }
    // If tournament just ended, show winner modal with receipt
    const champ = getTournamentChampion(nextMatches, activeTab);
    if (champ) setShowTournamentWinnerModal(true);
  };

  const handleStartFlex10Tournament = useCallback(async () => {
    const entryIds = flex10EntrySlots.filter((id): id is string => id != null && id !== "");
    const count = entryIds.length;
    if (count < 8 || count > 10) {
      alert("Please add between 8 and 10 players to start the tournament.");
      return;
    }
    const playerCount = count as Flex10PlayerCount;
    setShowResetConfirm(false);
    try {
      await setDoc(doc(db, "config", "invitational_10double"), { started: true, playerCount });
      const seeded = seedFlex10Bracket(playerCount, entryIds, players);
      const matchesRef = collection(db, "matches");
      for (const match of seeded) {
        await setDoc(doc(matchesRef, match.id), match);
      }
      setFlex10Config({ started: true, playerCount });
      setMatches(seeded);
    } catch (e) {
      if ((e as { code?: string })?.code === "permission-denied") showLimitReachedModal();
      else console.error("Start tournament:", e);
    }
  }, [flex10EntrySlots, players, showLimitReachedModal]);

  const handleResetTournament = async () => {
    if (!canEdit) return;
    setShowResetConfirm(false);
    setShowTournamentWinnerModal(false);
    if (activeTab === "10-double") {
      try {
        await setDoc(doc(db, "config", "invitational_10double"), { started: false, playerCount: null });
      } catch (e) {
        console.error("Reset 10-double config:", e);
      }
      setFlex10Config({ started: false, playerCount: null });
      setFlex10EntrySlots(Array(10).fill(null));
      setMatches([]);
      return;
    }
    await initializeMatches(activeTab);
  };

  const getTournamentChampion = useCallback((matchList: Match[], tab: InvitationalTab): Player | null => {
    if (tab === "8-double") {
      const m14 = matchList.find((m) => m.id === "8-de-m14");
      const m15 = matchList.find((m) => m.id === "8-de-m15");
      if (m15?.status === "completed" && m15.winner && m15.player1 && m15.player2)
        return m15.winner === "player1" ? m15.player1 : m15.player2;
      if (m14?.status === "completed" && m14.winner && m14.player1 && m14.player2) {
        const m13 = matchList.find((m) => m.id === "8-de-m13");
        const lbChampion = m13?.winner && m13.player1 && m13.player2
          ? (m13.winner === "player1" ? m13.player1 : m13.player2)
          : null;
        const m14Winner = m14.winner === "player1" ? m14.player1 : m14.player2;
        if (lbChampion && m14Winner.id === lbChampion.id) return null;
        return m14Winner;
      }
      return null;
    }
    if (tab === "8-double-bracket-a") {
      const m14 = matchList.find((m) => m.id === "8de-a-m14");
      const m15 = matchList.find((m) => m.id === "8de-a-m15");
      if (m15?.status === "completed" && m15.winner && m15.player1 && m15.player2)
        return m15.winner === "player1" ? m15.player1 : m15.player2;
      if (m14?.status === "completed" && m14.winner && m14.player1 && m14.player2) {
        const m13 = matchList.find((m) => m.id === "8de-a-m13");
        const lbChampion = m13?.winner && m13.player1 && m13.player2
          ? (m13.winner === "player1" ? m13.player1 : m13.player2)
          : null;
        const m14Winner = m14.winner === "player1" ? m14.player1 : m14.player2;
        if (lbChampion && m14Winner.id === lbChampion.id) return null;
        return m14Winner;
      }
      return null;
    }
    if (tab === "10-double-bracket-a") {
      const m30 = matchList.find((m) => m.id === "10de-a-30");
      const m31 = matchList.find((m) => m.id === "10de-a-31");
      if (m31?.status === "completed" && m31.winner && m31.player1 && m31.player2)
        return m31.winner === "player1" ? m31.player1 : m31.player2;
      if (m30?.status === "completed" && m30.winner && m30.player1 && m30.player2) {
        if (m30.winner === "player1") return m30.player1;
        return null;
      }
      return null;
    }
    const champFor8DeBracket = (prefix: string) => {
      const m14 = matchList.find((m) => m.id === `${prefix}-m14`);
      const m15 = matchList.find((m) => m.id === `${prefix}-m15`);
      if (m15?.status === "completed" && m15.winner && m15.player1 && m15.player2)
        return m15.winner === "player1" ? m15.player1 : m15.player2;
      if (m14?.status === "completed" && m14.winner && m14.player1 && m14.player2) {
        const m13 = matchList.find((m) => m.id === `${prefix}-m13`);
        const lbChampion = m13?.winner && m13.player1 && m13.player2 ? (m13.winner === "player1" ? m13.player1 : m13.player2) : null;
        const m14Winner = m14.winner === "player1" ? m14.player1 : m14.player2;
        if (lbChampion && m14Winner.id === lbChampion.id) return null;
        return m14Winner;
      }
      return null;
    };
    if (tab === "8-double-bracket-b") return champFor8DeBracket("8de-b");
    if (tab === "8-double-bracket-c") return champFor8DeBracket("8de-c");
    if (tab === "8-double-bracket-d") return champFor8DeBracket("8de-d");
    if (tab === "8-single") {
      const m7 = matchList.find((m) => m.id === "8-se-m7");
      if (m7?.status === "completed" && m7.winner && m7.player1 && m7.player2)
        return m7.winner === "player1" ? m7.player1 : m7.player2;
      return null;
    }
    if (tab === "4-double") {
      const m7 = matchList.find((m) => m.id === "4-de-m7");
      const m6 = matchList.find((m) => m.id === "4-de-m6");
      if (m7?.status === "completed" && m7.winner && m7.player1 && m7.player2)
        return m7.winner === "player1" ? m7.player1 : m7.player2;
      if (m6?.status === "completed" && m6.winner && m6.player1 && m6.player2) {
        const m5 = matchList.find((m) => m.id === "4-de-m5");
        const lbChampion = m5?.winner && m5.player1 && m5.player2
          ? (m5.winner === "player1" ? m5.player1 : m5.player2)
          : null;
        const m6Winner = m6.winner === "player1" ? m6.player1 : m6.player2;
        if (lbChampion && m6Winner.id === lbChampion.id) return null; // bracket reset needed
        return m6Winner;
      }
      return null;
    }
    if (tab === "4-single") {
      const m3 = matchList.find((m) => m.id === "4-se-m3");
      if (m3?.status === "completed" && m3.winner && m3.player1 && m3.player2)
        return m3.winner === "player1" ? m3.player1 : m3.player2;
      return null;
    }
    if (tab === "16-single") {
      const m15 = matchList.find((m) => m.id === "16-se-m15");
      if (m15?.status === "completed" && m15.winner && m15.player1 && m15.player2)
        return m15.winner === "player1" ? m15.player1 : m15.player2;
      return null;
    }
    if (tab === "10-double" && flex10Config.playerCount) {
      const champForFlex = (gfId: string, resetId: string, lbFinalId: string) => {
        const gf = matchList.find((m) => m.id === resetId);
        const grandFinal = matchList.find((m) => m.id === gfId);
        if (gf?.status === "completed" && gf.winner && gf.player1 && gf.player2)
          return gf.winner === "player1" ? gf.player1 : gf.player2;
        if (grandFinal?.status === "completed" && grandFinal.winner && grandFinal.player1 && grandFinal.player2) {
          const lbFinal = matchList.find((m) => m.id === lbFinalId);
          const lbChamp = lbFinal?.winner && lbFinal.player1 && lbFinal.player2
            ? (lbFinal.winner === "player1" ? lbFinal.player1 : lbFinal.player2)
            : null;
          const gfWinner = grandFinal.winner === "player1" ? grandFinal.player1 : grandFinal.player2;
          if (lbChamp && gfWinner.id === lbChamp.id) return null;
          return gfWinner;
        }
        return null;
      };
      if (flex10Config.playerCount === 8) return champForFlex("10de-8-m14", "10de-8-m15", "10de-8-m13");
      if (flex10Config.playerCount === 9) return champForFlex("10de-9-m14", "10de-9-m15", "10de-9-m13");
      return champForFlex("10de-10-m16", "10de-10-m17", "10de-10-m15");
    }
    return null;
  }, [flex10Config.playerCount]);

  const tournamentChampion = getTournamentChampion(matches, activeTab);

  if (loading || authLoading) {
    return (
      <div className="p-3 bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-100">
            Loading tournament...
          </div>
        </div>
      </div>
    );
  }

  const formatLabel =
    activeTab === "8-double"
      ? "8-Player Double Elimination"
      : activeTab === "8-double-bracket-a"
      ? "8D- Bracket A (Double Elimination)"
      : activeTab === "8-double-bracket-b"
      ? "8D- Bracket B (Double Elimination)"
      : activeTab === "8-double-bracket-c"
      ? "8D- Bracket C (Double Elimination)"
      : activeTab === "8-double-bracket-d"
      ? "8D- Bracket D (Double Elimination)"
      : activeTab === "10-double-bracket-a"
      ? "10P- Bracket A (Double Elimination)"
      : activeTab === "10-double"
      ? (flex10Config.started && flex10Config.playerCount
          ? `${flex10Config.playerCount}-Player Double Elimination`
          : "8–10 Players Double Elimination (add 8–10 players, then Start)")
      : activeTab === "8-single"
      ? "8-Player Single Elimination"
      : activeTab === "4-double"
      ? "4-Player Double Elimination"
      : activeTab === "4-single"
      ? "4-Player Single Elimination"
      : "16-Player Single Elimination";

  return (
    <div className="p-3 bg-slate-900 min-h-screen text-slate-100">
      <div className="max-w-7xl mx-auto pb-10">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-50 mb-3">Invitational</h1>
          <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-amber-950"
                    : "bg-slate-700 text-slate-100 hover:bg-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="text-sm text-slate-300">{formatLabel}</span>
          <div className="flex items-center gap-2">
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTournamentWinnerModal(true)}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-400"
              >
                View results
              </button>
            )}
            {canEdit && matches.length > 0 && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="rounded-md border border-red-500 bg-slate-900 px-3 py-1.5 text-sm font-medium text-red-300 hover:bg-red-950"
              >
                Reset bracket
              </button>
            )}
          </div>
        </div>

        <TournamentWinnerModal
          isOpen={showTournamentWinnerModal}
          onClose={() => setShowTournamentWinnerModal(false)}
          champion={tournamentChampion}
          matches={matches}
          formatLabel={formatLabel}
        />

        {/* Reset confirmation modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <p className="text-slate-100 font-medium mb-1">Reset this bracket?</p>
              <p className="text-sm text-slate-300 mb-4">
                All matches for this format will be cleared. Other tabs are not affected.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 rounded-md border border-slate-500 bg-slate-900 py-2 text-slate-100 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetTournament}
                  className="flex-1 rounded-md bg-red-600 py-2 text-white font-medium hover:bg-red-700"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "8-double" && (
        <div className="flex flex-col space-y-2">
          {/* Winners Bracket: M1–M7 */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                WB
              </div>
              <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8-de-m1", "8-de-m2", "8-de-m3", "8-de-m4"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                  <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                    {["8-de-m5", "8-de-m6"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8-de-m7", false)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 my-2" />

          {/* Losers Bracket: M8–M13 — reduced min-heights only; alignment kept for bracket flow */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                LB
              </div>
              <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8-de-m8", "8-de-m9"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8-de-m10", "8-de-m11"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8-de-m12", true)}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8-de-m13", true)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 my-2" />

          {/* Grand Final (M14) + Bracket Reset (M15) */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                Finals
              </div>
              <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("8-de-m14", false)}
                {renderMatchBox("8-de-m15", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 10-double: Initial entry (8–10 players) then Start */}
        {activeTab === "10-double" && !flex10Config.started && (
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-6 max-w-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-2">Initial entry</h2>
            <p className="text-sm text-slate-300 mb-4">Add 8, 9, or 10 players. Order determines bracket placement. Then click Start tournament.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-slate-400 w-6 text-sm">{i + 1}.</span>
                  <select
                    className="flex-1 border border-slate-600 rounded-md px-2 py-1.5 text-slate-100 bg-slate-800 text-sm"
                    value={flex10EntrySlots[i] ?? ""}
                    onChange={(e) => {
                      const next = [...flex10EntrySlots];
                      next[i] = e.target.value || null;
                      setFlex10EntrySlots(next);
                    }}
                  >
                    <option value="">— Select —</option>
                    {players
                      .filter((p) => !flex10EntrySlots.some((id, j) => j !== i && id === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleStartFlex10Tournament}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-400"
            >
              Start tournament
            </button>
          </div>
        )}

        {/* 10-double: 8-player bracket (no qualy) */}
        {activeTab === "10-double" && flex10Config.started && flex10Config.playerCount === 8 && (
          <div className="flex flex-col space-y-2">
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
                <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-8-m1", "10de-8-m2", "10de-8-m3", "10de-8-m4"].map((id) => renderMatchBox(id, false))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                    <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                      {["10de-8-m5", "10de-8-m6"].map((id) => renderMatchBox(id, false))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-8-m7", false)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
                <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-8-m8", "10de-8-m9"].map((id) => renderMatchBox(id, true))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-8-m10", "10de-8-m11"].map((id) => renderMatchBox(id, true))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-8-m12", true)}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-8-m13", true)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
                <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
              </div>
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("10de-8-m14", false)}
                {renderMatchBox("10de-8-m15", false)}
              </div>
            </div>
          </div>
        )}

        {/* 10-double: 9-player bracket (1 qualy) */}
        {activeTab === "10-double" && flex10Config.started && flex10Config.playerCount === 9 && (
          <div className="flex flex-col space-y-2">
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-emerald-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Qualy</div>
                <h2 className="text-lg font-bold text-slate-100">Qualifying</h2>
              </div>
              <div className="flex space-x-4 pb-2">
                {renderMatchBox("10de-9-q1", false)}
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
                <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-9-m1", "10de-9-m2", "10de-9-m3", "10de-9-m4"].map((id) => renderMatchBox(id, false))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                    <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                      {["10de-9-m5", "10de-9-m6"].map((id) => renderMatchBox(id, false))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-9-m7", false)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
                <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-9-m8", "10de-9-m9"].map((id) => renderMatchBox(id, true))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-9-m10", "10de-9-m11"].map((id) => renderMatchBox(id, true))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-9-m12", true)}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-9-m13", true)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
                <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
              </div>
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("10de-9-m14", false)}
                {renderMatchBox("10de-9-m15", false)}
              </div>
            </div>
          </div>
        )}

        {/* 10-double: 10-player bracket (2 qualy) */}
        {activeTab === "10-double" && flex10Config.started && flex10Config.playerCount === 10 && (
          <div className="flex flex-col space-y-2">
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-emerald-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Qualy</div>
                <h2 className="text-lg font-bold text-slate-100">Qualifying</h2>
              </div>
              <div className="flex space-x-4 pb-2">
                {renderMatchBox("10de-10-q1", false)}
                {renderMatchBox("10de-10-q2", false)}
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
                <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-10-m1", "10de-10-m2", "10de-10-m3", "10de-10-m4"].map((id) => renderMatchBox(id, false))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                    <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                      {["10de-10-m5", "10de-10-m6"].map((id) => renderMatchBox(id, false))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[250px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-10-m7", false)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
                <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-10-m8", "10de-10-m9"].map((id) => renderMatchBox(id, true))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-10-m10", "10de-10-m11"].map((id) => renderMatchBox(id, true))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {["10de-10-m12", "10de-10-m13"].map((id) => renderMatchBox(id, true))}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R4</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-10-m14", true)}
                    </div>
                  </div>
                  <div className="flex flex-col min-h-[175px]">
                    <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                    <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                      {renderMatchBox("10de-10-m15", true)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-300 my-2" />
            <div className="w-full">
              <div className="flex items-center mb-2">
                <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
                <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
              </div>
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("10de-10-m16", false)}
                {renderMatchBox("10de-10-m17", false)}
              </div>
            </div>
          </div>
        )}
        
        {/* 10-Player Bracket A */}
        {activeTab === "10-double-bracket-a" && (
          <TenPlayerBracketA players={players} canEdit={canEdit} />
        )}

        {/* 8D- Bracket A: same UI as 8 Double, own data; no Tour Manager sync */}
        {activeTab === "8-double-bracket-a" && (
        <div className="flex flex-col space-y-2">
          {/* Winners Bracket: M1–M7 */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                WB
              </div>
              <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-a-m1", "8de-a-m2", "8de-a-m3", "8de-a-m4"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                  <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                    {["8de-a-m5", "8de-a-m6"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-a-m7", false)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 my-2" />

          {/* Losers Bracket: M8–M13 */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                LB
              </div>
              <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-a-m8", "8de-a-m9"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-a-m10", "8de-a-m11"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-a-m12", true)}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-a-m13", true)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-300 my-2" />

          {/* Grand Final (M14) + Bracket Reset (M15) */}
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">
                Finals
              </div>
              <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("8de-a-m14", false)}
                {renderMatchBox("8de-a-m15", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 8D- Bracket B */}
        {activeTab === "8-double-bracket-b" && (
        <div className="flex flex-col space-y-2">
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
              <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-b-m1", "8de-b-m2", "8de-b-m3", "8de-b-m4"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                  <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                    {["8de-b-m5", "8de-b-m6"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-b-m7", false)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
              <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-b-m8", "8de-b-m9"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-b-m10", "8de-b-m11"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-b-m12", true)}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-b-m13", true)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
              <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("8de-b-m14", false)}
                {renderMatchBox("8de-b-m15", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 8D- Bracket C */}
        {activeTab === "8-double-bracket-c" && (
        <div className="flex flex-col space-y-2">
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
              <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-c-m1", "8de-c-m2", "8de-c-m3", "8de-c-m4"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                  <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                    {["8de-c-m5", "8de-c-m6"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-c-m7", false)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
              <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-c-m8", "8de-c-m9"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-c-m10", "8de-c-m11"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-c-m12", true)}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-c-m13", true)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
              <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("8de-c-m14", false)}
                {renderMatchBox("8de-c-m15", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 8D- Bracket D */}
        {activeTab === "8-double-bracket-d" && (
        <div className="flex flex-col space-y-2">
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
              <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-12 min-w-max pb-2 items-center min-h-[300px]">
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-d-m1", "8de-d-m2", "8de-d-m3", "8de-d-m4"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R2</div>
                  <div className="flex flex-col space-y-16 items-center justify-center flex-1">
                    {["8de-d-m5", "8de-d-m6"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[250px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-d-m7", false)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
              <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[210px]">
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-d-m8", "8de-d-m9"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R2</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {["8de-d-m10", "8de-d-m11"].map((id) => renderMatchBox(id, true))}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R3</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-d-m12", true)}
                  </div>
                </div>
                <div className="flex flex-col min-h-[175px]">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                    {renderMatchBox("8de-d-m13", true)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
              <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("8de-d-m14", false)}
                {renderMatchBox("8de-d-m15", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 8 Single: R1 → Semis → Final */}
        {activeTab === "8-single" && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center mb-2">
            <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">SE</div>
            <h2 className="text-lg font-bold text-slate-100">8-Player Single Elimination</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-2 items-center min-h-[280px]">
              <div className="flex flex-col min-h-[200px]">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">R1</div>
                <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                  {["8-se-m1", "8-se-m2", "8-se-m3", "8-se-m4"].map((id) => renderMatchBox(id, false))}
                </div>
              </div>
              <div className="flex flex-col min-h-[200px]">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">Semis</div>
                <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                  {["8-se-m5", "8-se-m6"].map((id) => renderMatchBox(id, false))}
                </div>
              </div>
              <div className="flex flex-col min-h-[200px]">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">Final</div>
                <div className="flex flex-col space-y-1 items-center justify-center flex-1">
                  {renderMatchBox("8-se-m7", false)}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 4 Double: WB R1 → WB Final → LB R1 → LB Final → GF → Bracket Reset */}
        {activeTab === "4-double" && (
        <div className="flex flex-col space-y-2">
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">WB</div>
              <h2 className="text-lg font-bold text-slate-100">Winners Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB R1</div>
                  <div className="flex flex-col space-y-1">
                    {["4-de-m1", "4-de-m2"].map((id) => renderMatchBox(id, false))}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">WB Final</div>
                  <div className="flex flex-col space-y-1">{renderMatchBox("4-de-m3", false)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex items-center mb-2">
              <div className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">LB</div>
              <h2 className="text-lg font-bold text-slate-100">Losers Bracket</h2>
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB R1</div>
                  <div className="flex flex-col space-y-1">{renderMatchBox("4-de-m4", true)}</div>
                </div>
                <div className="flex flex-col">
                  <div className="text-center font-bold text-sm text-slate-200 mb-2">LB Final</div>
                  <div className="flex flex-col space-y-1">{renderMatchBox("4-de-m5", true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-300 my-2" />
          <div className="w-full">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">Finals</div>
              <h2 className="text-lg font-bold text-slate-100">Grand Final &amp; Bracket Reset</h2>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleUpdateTourManager}
                  className="bg-red-900 hover:bg-red-800 text-white font-semibold px-3 py-1.5 rounded-lg border-2 border-red-950 shadow-md transition-colors"
                  title="Push Grand Final (M6) to Tour Manager-4 overlay"
                >
                  Update Tour Manager
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2 items-center">
                {renderMatchBox("4-de-m6", false)}
                {renderMatchBox("4-de-m7", false)}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 4 Single: Semis → Final */}
        {activeTab === "4-single" && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center mb-2">
            <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">SE</div>
            <h2 className="text-lg font-bold text-slate-100">4-Player Single Elimination</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-2 items-center">
              <div className="flex flex-col">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">Semis</div>
                <div className="flex flex-col space-y-1">
                  {["4-se-m1", "4-se-m2"].map((id) => renderMatchBox(id, false))}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">Final</div>
                <div className="flex flex-col space-y-1">{renderMatchBox("4-se-m3", false)}</div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 16 Single: R1 → QF → SF → Final (wide slots) */}
        {activeTab === "16-single" && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center mb-2">
            <div className="bg-blue-600 text-white px-2 py-1 rounded-lg font-bold mr-2 text-sm">SE</div>
            <h2 className="text-lg font-bold text-slate-100">16-Player Single Elimination (Wide)</h2>
          </div>
          <div className="overflow-x-auto">
            <div className="flex space-x-2 min-w-max pb-2 items-center min-h-[320px]">
              <div className="flex flex-col min-h-[260px]">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">R1</div>
                <div className="flex flex-col space-y-3 items-center justify-center flex-1">
                  {["16-se-m1","16-se-m2","16-se-m3","16-se-m4","16-se-m5","16-se-m6","16-se-m7","16-se-m8"].map((id) =>
                    renderMatchBox(id, false, true)
                  )}
                </div>
              </div>
              <div className="flex flex-col min-h-[260px]">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">QF</div>
                <div className="flex flex-col items-center justify-center flex-1 space-y-24">
                  {["16-se-m9","16-se-m10","16-se-m11","16-se-m12"].map((id) =>
                    renderMatchBox(id, false, true)
                  )}
                </div>
              </div>
              <div className="flex flex-col min-h-[260px]">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">SF</div>
                <div className="flex flex-col space-y-[15.8rem] items-center justify-center flex-1">
                  {["16-se-m13","16-se-m14"].map((id) => renderMatchBox(id, false, true))}
                </div>
              </div>
              <div className="flex flex-col min-h-[260px]">
                <div className="text-center font-bold text-sm text-slate-200 mb-2">Final</div>
                <div className="flex flex-col space-y-3 items-center justify-center flex-1">
                  {renderMatchBox("16-se-m15", false, true)}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Match Input Modal */}
      {isModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-96 max-w-md mx-4 border border-slate-600">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100">
                {selectedMatch.matchNumber} - {selectedMatch.round}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 font-medium hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Player selection: editable only in first-round matches per format; after that show names read-only */}
              {(() => {
                const firstRoundIds: string[] =
                  activeTab === "8-double"
                    ? ["8-de-m1", "8-de-m2", "8-de-m3", "8-de-m4"]
                    : activeTab === "8-double-bracket-a"
                    ? ["8de-a-m1", "8de-a-m2", "8de-a-m3", "8de-a-m4"]
                    : activeTab === "8-double-bracket-b"
                    ? ["8de-b-m1", "8de-b-m2", "8de-b-m3", "8de-b-m4"]
                    : activeTab === "8-double-bracket-c"
                    ? ["8de-c-m1", "8de-c-m2", "8de-c-m3", "8de-c-m4"]
                    : activeTab === "8-double-bracket-d"
                    ? ["8de-d-m1", "8de-d-m2", "8de-d-m3", "8de-d-m4"]
                    : activeTab === "10-double" && flex10Config.playerCount === 8
                    ? ["10de-8-m1", "10de-8-m2", "10de-8-m3", "10de-8-m4"]
                    : activeTab === "10-double" && flex10Config.playerCount === 9
                    ? ["10de-9-q1", "10de-9-m1", "10de-9-m2", "10de-9-m3", "10de-9-m4"]
                    : activeTab === "10-double" && flex10Config.playerCount === 10
                    ? ["10de-10-q1", "10de-10-q2", "10de-10-m1", "10de-10-m2", "10de-10-m3", "10de-10-m4"]
                    : activeTab === "8-single"
                    ? ["8-se-m1", "8-se-m2", "8-se-m3", "8-se-m4"]
                    : activeTab === "4-double"
                    ? ["4-de-m1", "4-de-m2"]
                    : activeTab === "4-single"
                    ? ["4-se-m1", "4-se-m2"]
                    : activeTab === "16-single"
                    ? ["16-se-m1","16-se-m2","16-se-m3","16-se-m4","16-se-m5","16-se-m6","16-se-m7","16-se-m8"]
                    : [];
                const isFirstRound = selectedMatch && firstRoundIds.includes(selectedMatch.id);
                const name1 = players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1";
                const name2 = players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2";
                const searchLower = playerSearch.trim().toLowerCase();

                // Prevent duplicate players within the same format's first-round matches
                const firstRoundUsedIds = new Set<string>();
                if (firstRoundIds.length > 0 && selectedMatch) {
                  for (const m of matches) {
                    if (!firstRoundIds.includes(m.id)) continue;
                    if (m.id === selectedMatch.id) continue;
                    if (m.player1?.id) firstRoundUsedIds.add(m.player1.id);
                    if (m.player2?.id) firstRoundUsedIds.add(m.player2.id);
                  }
                }

                const filteredPlayers = (searchLower
                  ? players.filter((p) => p.name.toLowerCase().includes(searchLower))
                  : players
                ).filter((p) => !firstRoundUsedIds.has(p.id));
                if (isFirstRound) {
                  return (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Search players</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            className="flex-1 border border-slate-600 rounded-md px-3 py-1.5 text-slate-100 text-sm bg-slate-800"
                            placeholder="Type to filter names..."
                          />
                          {playerSearch && (
                            <button
                              type="button"
                              onClick={() => setPlayerSearch("")}
                              className="px-2 py-1 rounded-md border border-slate-500 bg-slate-700 text-xs text-slate-100 hover:bg-slate-600"
                              title="Clear search"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Player 1</label>
                        <select
                          className="w-full border border-slate-600 rounded-md px-3 py-2 text-slate-100 bg-slate-800"
                          value={selectedPlayer1}
                          onChange={(e) => setSelectedPlayer1(e.target.value)}
                        >
                          <option value="">Select Player</option>
                          {filteredPlayers
                            .filter((p) => p.id !== selectedPlayer2)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Player 2</label>
                        <select
                          className="w-full border border-slate-600 rounded-md px-3 py-2 text-slate-100 bg-slate-800"
                          value={selectedPlayer2}
                          onChange={(e) => setSelectedPlayer2(e.target.value)}
                        >
                          <option value="">Select Player</option>
                          {filteredPlayers
                            .filter((p) => p.id !== selectedPlayer1)
                            .map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                      </div>
                    </>
                  );
                }
                return (
                  <div className="flex gap-4 text-sm">
                    <div className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 font-medium">
                      {name1}
                    </div>
                    <div className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 font-medium">
                      {name2}
                    </div>
                  </div>
                );
              })()}

              {/* Race to X - preserved */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Race to X</label>
                <input
                  type="number"
                  min="1"
                  max="21"
                  className="w-full border border-slate-600 rounded-md px-3 py-2 text-slate-100 bg-slate-800"
                  value={raceTo}
                  onChange={(e) => setRaceTo(parseInt(e.target.value) || 5)}
                />
              </div>

              {/* Scores: labels are advancing player names; same increment/decrement UI */}
              {(() => {
                const name1 = players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1";
                const name2 = players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2";
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">{name1}</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDecrementScore1}
                          className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score1 <= 0}
                          aria-label={`Decrement ${name1}`}
                        >
                          −
                        </button>
                        <span className="min-w-[3rem] text-center text-lg font-bold text-slate-100">
                          {score1}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrementScore1}
                          className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score1 >= raceTo}
                          aria-label={`Increment ${name1}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">{name2}</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDecrementScore2}
                          className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score2 <= 0}
                          aria-label={`Decrement ${name2}`}
                        >
                          −
                        </button>
                        <span className="min-w-[3rem] text-center text-lg font-bold text-slate-100">
                          {score2}
                        </span>
                        <button
                          type="button"
                          onClick={handleIncrementScore2}
                          className="w-10 h-10 rounded-md border-2 border-slate-500 bg-slate-800 text-slate-100 font-bold hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
                          disabled={score2 >= raceTo}
                          aria-label={`Increment ${name2}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Winner confirmation popup (inside modal) */}
              {showWinnerConfirm && pendingWinner && (
                <div className="rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-slate-100 mb-1">
                    Confirm winner
                  </p>
                  <p className="text-slate-300 mb-3">
                    {pendingWinner === "player1"
                      ? players.find((p) => p.id === selectedPlayer1)?.name ?? "Player 1"
                      : players.find((p) => p.id === selectedPlayer2)?.name ?? "Player 2"}{" "}
                    has reached race to {raceTo}. Confirm as winner?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelWinnerConfirm}
                      className="flex-1 py-2 px-3 rounded-md border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmWinner}
                      className="flex-1 py-2 px-3 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700"
                    >
                      Confirm winner
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-700 text-white py-2 px-4 rounded-md hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMatch}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function InvitationalPageWithSuspense() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <InvitationalPage />
    </Suspense>
  );
}
