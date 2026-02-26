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
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_USAGE_RATIO_THRESHOLD = 0.9;

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

async function listRecords(): Promise<StoredPdfEditorBlob[]> {
  const db = await openDb();
  const rows = await new Promise<StoredPdfEditorBlob[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      resolve(Array.isArray(req.result) ? (req.result as StoredPdfEditorBlob[]) : []);
    };
    req.onerror = () => reject(req.error);
  });
  return rows;
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

export async function cleanupPdfEditorCache(
  options?: { maxAgeMs?: number; usageRatioThreshold?: number }
): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_CACHE_TTL_MS;
  const usageRatioThreshold = options?.usageRatioThreshold ?? DEFAULT_USAGE_RATIO_THRESHOLD;
  const now = Date.now();

  const records = await listRecords();
  if (records.length === 0) return;

  const stale = records.filter((row) => now - row.updatedAt > maxAgeMs);
  if (stale.length > 0) {
    await Promise.all(stale.map((row) => deleteRecord(row.key)));
  }

  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;

  const estimate = await navigator.storage.estimate().catch(() => null);
  const usage = typeof estimate?.usage === "number" ? estimate.usage : 0;
  const quota = typeof estimate?.quota === "number" ? estimate.quota : 0;
  if (!usage || !quota) return;

  let projectedUsage = usage;
  const currentRatio = projectedUsage / quota;
  if (currentRatio < usageRatioThreshold) return;

  const freshRecords = records
    .filter((row) => !stale.some((expired) => expired.key === row.key))
    .sort((a, b) => a.updatedAt - b.updatedAt);

  for (const row of freshRecords) {
    await deleteRecord(row.key);
    projectedUsage = Math.max(0, projectedUsage - (row.blob.size || 0));
    if (projectedUsage / quota < usageRatioThreshold) break;
  }
}
