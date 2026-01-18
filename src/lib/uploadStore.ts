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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
    request.onerror = () => reject(request.error);
  });
}

export async function saveUpload(files: File[]): Promise<string> {
  const db = await openDb();
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

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return id;
}

export async function loadUpload(id: string): Promise<File[] | null> {
  const db = await openDb();
  const record = await new Promise<StoredUpload | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as StoredUpload | undefined);
    req.onerror = () => reject(req.error);
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
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
