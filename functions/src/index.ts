import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

admin.initializeApp();

const USAGE_DOC = "usage/current";
const DAILY_LIMIT = 1000;

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function incrementDailyUsage(): Promise<void> {
  const db = admin.firestore();
  const ref = db.doc(USAGE_DOC);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const today = todayString();
    if (!snap.exists) {
      tx.set(ref, { date: today, count: 1 });
      return;
    }
    const data = snap.data();
    const prevDate = (data?.date as string) || "";
    const prevCount = (data?.count as number) || 0;
    if (prevDate !== today) {
      tx.set(ref, { date: today, count: 1 });
    } else {
      const next = Math.min(prevCount + 1, DAILY_LIMIT + 1);
      tx.update(ref, { count: next });
    }
  });
}

const runIncrement = () => incrementDailyUsage().catch((err) => console.error("usage increment error:", err));

export const onPlayersWrite = onDocumentWritten("players/{id}", () => runIncrement());
export const onMatchesWrite = onDocumentWritten("matches/{id}", () => runIncrement());
export const onCurrentMatchWrite = onDocumentWritten("current_match/{id}", () => runIncrement());
export const onConfigWrite = onDocumentWritten("config/{id}", () => runIncrement());
export const onLogosWrite = onDocumentWritten("logos/{id}", () => runIncrement());
export const onTournamentsWrite = onDocumentWritten("tournaments/{id}", () => runIncrement());
