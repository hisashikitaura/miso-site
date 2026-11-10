import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore/lite";
import { db } from "./firebase";
import { DEFAULT_SETTINGS, type MisoEntry, type MisoSettings } from "./types";

export const ENTRIES = "miso_entries";
export const SETTINGS = "miso_settings";

export const sortEntries = (a: MisoEntry, b: MisoEntry) =>
  a.date === b.date
    ? (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
    : a.date < b.date ? -1 : 1;

export async function fetchPublishedEntries(): Promise<MisoEntry[]> {
  // Single-field filter only → no composite index needed. Sort on the client.
  const snap = await getDocs(query(collection(db, ENTRIES), where("published", "==", true)));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<MisoEntry, "id">), id: d.id })).sort(sortEntries);
}

export async function fetchSettings(): Promise<MisoSettings> {
  const s = await getDoc(doc(db, SETTINGS, "main"));
  return s.exists() ? { ...DEFAULT_SETTINGS, ...(s.data() as Partial<MisoSettings>) } : DEFAULT_SETTINGS;
}

