"use client";

type CacheKey = "input" | "output";

type StoredPdfEditorBlob = {
  key: CacheKey;
  updatedAt: number;
  name: string;
  type: string;
  lastModified?: number;
  blob: Blob;
};

const DB_NAME = "pdf-tools-cache";
const DB_VERSION = 1;
const STORE_NAME = "pdf-editor";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord(record: StoredPdfEditorBlob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getRecord(key: CacheKey): Promise<StoredPdfEditorBlob | null> {
  const db = await openDb();
  const record = await new Promise<StoredPdfEditorBlob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as StoredPdfEditorBlob | undefined);
    req.onerror = () => reject(req.error);
  });
  return record ?? null;
}

async function deleteRecord(key: CacheKey): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function savePdfEditorInput(file: File): Promise<void> {
  await putRecord({
    key: "input",
    updatedAt: Date.now(),
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    blob: file,
  });
}

export async function loadPdfEditorInput(): Promise<File | null> {
  const record = await getRecord("input");
  if (!record) return null;
  return new File([record.blob], record.name, {
    type: record.type,
    lastModified: record.lastModified ?? record.updatedAt,
  });
}

export async function savePdfEditorOutput(blob: Blob, name: string): Promise<void> {
  await putRecord({
    key: "output",
    updatedAt: Date.now(),
    name,
    type: blob.type || "application/pdf",
    blob,
  });
}

export async function loadPdfEditorOutput(): Promise<File | null> {
  const record = await getRecord("output");
  if (!record) return null;
  return new File([record.blob], record.name, {
    type: record.type,
    lastModified: record.updatedAt,
  });
}

export async function clearPdfEditorCache(): Promise<void> {
  await Promise.all([deleteRecord("input"), deleteRecord("output")]);
}

