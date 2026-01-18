"use client";

import { safeRandomUUID } from "@/lib/safeRandomUUID";

type StoredFile = {
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
};

export type GuestDocumentRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  toolKey: string;
  files: StoredFile[];
};

const DB_NAME = "files-editor";
const DB_VERSION = 2;
const STORE_NAME = "guest-documents";

const inMemoryStore = new Map<string, GuestDocumentRecord>();

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
      if (!db.objectStoreNames.contains("uploads")) {
        db.createObjectStore("uploads", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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

function filesToStored(files: File[]): StoredFile[] {
  return files.map((file) => ({
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    blob: file,
  }));
}

function storedToFiles(stored: StoredFile[]): File[] {
  return stored.map(
    (f) =>
      new File([f.blob], f.name, {
        type: f.type,
        lastModified: f.lastModified,
      })
  );
}

export async function createGuestDocument(toolKey: string, files: File[]): Promise<string> {
  const id = safeRandomUUID();
  const now = Date.now();
  const value: GuestDocumentRecord = {
    id,
    createdAt: now,
    updatedAt: now,
    toolKey,
    files: filesToStored(files),
  };

  const db = await getDb();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
      });
      return id;
    } catch {
      // Fall back to in-memory storage (Safari Private Browsing / WebKit quirks).
    }
  }

  inMemoryStore.set(id, value);

  return id;
}

export async function loadGuestDocument(id: string): Promise<{ toolKey: string; files: File[] } | null> {
  const inMem = inMemoryStore.get(id);
  if (inMem) return { toolKey: inMem.toolKey, files: storedToFiles(inMem.files) };

  const db = await getDb();
  if (!db) return null;

  const record = await new Promise<GuestDocumentRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as GuestDocumentRecord | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });

  if (!record) return null;
  return { toolKey: record.toolKey, files: storedToFiles(record.files) };
}

export async function updateGuestDocumentTool(id: string, toolKey: string): Promise<void> {
  const mem = inMemoryStore.get(id);
  if (mem) {
    mem.toolKey = toolKey;
    mem.updatedAt = Date.now();
    return;
  }

  const db = await getDb();
  if (!db) return;

  const record = await new Promise<GuestDocumentRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as GuestDocumentRecord | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  if (!record) return;
  record.toolKey = toolKey;
  record.updatedAt = Date.now();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}

export async function updateGuestDocumentFiles(id: string, files: File[]): Promise<void> {
  const mem = inMemoryStore.get(id);
  if (mem) {
    mem.files = filesToStored(files);
    mem.updatedAt = Date.now();
    return;
  }

  const db = await getDb();
  if (!db) return;

  const record = await new Promise<GuestDocumentRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as GuestDocumentRecord | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  if (!record) return;
  record.files = filesToStored(files);
  record.updatedAt = Date.now();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}
