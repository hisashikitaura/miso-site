import {
  collection, doc, getDoc, getDocs, orderBy, query, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore/lite";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db } from "./firebase";
import { storage } from "./firebase-admin";
import { ENTRIES, SETTINGS, sortEntries } from "./data";
import type { MisoEntry, MisoSettings, Photo } from "./types";

export async function fetchAllEntries(): Promise<MisoEntry[]> {
  const snap = await getDocs(query(collection(db, ENTRIES), orderBy("date", "asc")));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<MisoEntry, "id">), id: d.id })).sort(sortEntries);
}

export async function saveSettings(s: MisoSettings) {
  await setDoc(doc(db, SETTINGS, "main"), s);
}

/** Owner-only doc. Readable only if rules accept us as the owner. */
export async function probeOwner(): Promise<boolean> {
  try {
    await getDoc(doc(db, SETTINGS, "owner"));
    return true;
  } catch {
    return false;
  }
}

export type EntryInput = Omit<MisoEntry, "id" | "createdAt" | "updatedAt">;

export async function createEntry(e: EntryInput): Promise<string> {
  const r = await addDoc(collection(db, ENTRIES), {
    ...e, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return r.id;
}

export async function updateEntry(id: string, e: EntryInput) {
  await updateDoc(doc(db, ENTRIES, id), { ...e, updatedAt: serverTimestamp() });
}

export async function deleteEntry(entry: MisoEntry) {
  await Promise.all(entry.photos.map((p) => deletePhoto(p).catch(() => undefined)));
  await deleteDoc(doc(db, ENTRIES, entry.id));
}

export async function uploadPhoto(blob: Blob, w: number, h: number): Promise<Photo> {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const path = `miso/photos/${name}`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" });
  return { path, url: await getDownloadURL(r), w, h };
}

export async function deletePhoto(p: Photo) {
  await deleteObject(ref(storage, p.path));
}
