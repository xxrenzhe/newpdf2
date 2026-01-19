"use client";

import { safeRandomUUID } from "@/lib/safeRandomUUID";

type StoredFile = {
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
};

type StoredUpload = {
  id: string;
  createdAt: number;
  files: StoredFile[];
};

const DB_NAME = "files-editor";
const DB_VERSION = 2;
const STORE_NAME = "uploads";

const inMemoryStore = new Map<string, StoredUpload>();
const pendingDbWrites = new Map<string, Promise<void>>();
const deletedIds = new Set<string>();

let dbPromise: Promise<IDBDatabase> | null = null;
let dbFailed = false;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("guest-documents")) {
        db.createObjectStore("guest-documents", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function getDb(): Promise<IDBDatabase | null> {
  if (dbFailed) return null;
  if (!dbPromise) dbPromise = openDb();
  try {
    return await dbPromise;
  } catch {
    dbPromise = null;
    dbFailed = true;
    return null;
  }
}

async function putUploadRecord(value: StoredUpload): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}

async function deleteUploadRecord(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
}

export async function saveUpload(files: File[]): Promise<string> {
  const id = safeRandomUUID();
  const value: StoredUpload = {
    id,
    createdAt: Date.now(),
    files: files.map((file) => ({
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      blob: file,
    })),
  };

  // Always store in-memory first so same-tab navigation can use it immediately.
  inMemoryStore.set(id, value);

  // Persist to IndexedDB in the background as a best-effort fallback.
  const writePromise = putUploadRecord(value).catch(() => {});
  pendingDbWrites.set(id, writePromise);
  void writePromise.finally(() => {
    pendingDbWrites.delete(id);
    if (!deletedIds.has(id)) return;
    deletedIds.delete(id);
    void deleteUploadRecord(id).catch(() => {});
  });

  return id;
}

export async function loadUpload(id: string): Promise<File[] | null> {
  const inMem = inMemoryStore.get(id);
  if (inMem) {
    return inMem.files.map(
      (stored) =>
        new File([stored.blob], stored.name, {
          type: stored.type,
          lastModified: stored.lastModified,
        })
    );
  }

  const db = await getDb();
  if (!db) return null;

  const record = await new Promise<StoredUpload | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as StoredUpload | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });

  if (!record) return null;
  return record.files.map(
    (stored) =>
      new File([stored.blob], stored.name, {
        type: stored.type,
        lastModified: stored.lastModified,
      })
  );
}

export async function deleteUpload(id: string): Promise<void> {
  inMemoryStore.delete(id);
  deletedIds.add(id);

  const pending = pendingDbWrites.get(id);
  if (pending) {
    try {
      await pending;
    } catch {
      // ignore
    }
  }

  try {
    await deleteUploadRecord(id);
  } finally {
    deletedIds.delete(id);
  }
}
