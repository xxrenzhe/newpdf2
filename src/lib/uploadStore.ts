"use client";

/**
 * 安全文件上传存储模块
 * 支持可选的 AES-GCM 加密存储
 * 借鉴 qwerpdf.com 的客户端安全存储理念
 */

import { safeRandomUUID } from "@/lib/safeRandomUUID";

// ============================================================================
// 类型定义
// ============================================================================

type StoredFile = {
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
};

type EncryptedStoredFile = {
  name: string;
  type: string;
  lastModified: number;
  encryptedBlob: Blob;
  iv: string;
  checksum: string;
};

type StoredUpload = {
  id: string;
  createdAt: number;
  files: StoredFile[];
  encrypted?: false;
};

type EncryptedStoredUpload = {
  id: string;
  createdAt: number;
  files: EncryptedStoredFile[];
  encrypted: true;
};

type AnyStoredUpload = StoredUpload | EncryptedStoredUpload;

// ============================================================================
// 配置
// ============================================================================

const DB_NAME = "qwerpdf";
const DB_VERSION = 3; // 升级版本以支持加密
const STORE_NAME = "uploads";
const ENCRYPTION_KEY_NAME = "qwerpdf-upload-key-v1";

// 是否启用加密 (可通过环境变量配置)
const ENABLE_ENCRYPTION =
  typeof window !== "undefined" &&
  (() => {
    if (process.env.NEXT_PUBLIC_ENABLE_STORAGE_ENCRYPTION === "true") return true;
    try {
      return localStorage.getItem("qwerpdf-enable-encryption") === "true";
    } catch {
      return false;
    }
  })();

// ============================================================================
// 内存存储
// ============================================================================

const inMemoryStore = new Map<string, AnyStoredUpload>();
const pendingDbWrites = new Map<string, Promise<void>>();
const deletedIds = new Set<string>();

let dbPromise: Promise<IDBDatabase> | null = null;
let dbFailed = false;

// ============================================================================
// 加密工具
// ============================================================================

const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (!ENABLE_ENCRYPTION) return null;
  if (!globalThis.crypto?.subtle) return null;

  try {
    const stored = sessionStorage.getItem(ENCRYPTION_KEY_NAME);

    if (stored) {
      const keyData = base64ToBytes(stored);
      return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }

    // 生成新密钥
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const exported = await crypto.subtle.exportKey("raw", key);
    sessionStorage.setItem(ENCRYPTION_KEY_NAME, bytesToBase64(new Uint8Array(exported)));

    return await crypto.subtle.importKey(
      "raw",
      exported,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function calculateChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return bytesToBase64(hashArray).slice(0, 16);
}

async function encryptBlob(blob: Blob, key: CryptoKey): Promise<{ encrypted: Blob; iv: string; checksum: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = await blob.arrayBuffer();
  const checksum = await calculateChecksum(data);

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

  return {
    encrypted: new Blob([encrypted], { type: "application/octet-stream" }),
    iv: bytesToBase64(iv),
    checksum,
  };
}

async function decryptBlob(encryptedBlob: Blob, iv: string, key: CryptoKey, originalType: string): Promise<Blob> {
  const ivBytes = base64ToBytes(iv);
  const data = await encryptedBlob.arrayBuffer();

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, data);

  return new Blob([decrypted], { type: originalType });
}

// ============================================================================
// 数据库操作
// ============================================================================

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

async function putUploadRecord(value: AnyStoredUpload): Promise<void> {
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

// ============================================================================
// 公共 API
// ============================================================================

/**
 * 保存上传的文件
 * 如果启用加密，文件将被 AES-256-GCM 加密后存储
 */
export async function saveUpload(files: File[]): Promise<string> {
  const id = safeRandomUUID();
  const key = await getEncryptionKey();

  let value: AnyStoredUpload;

  if (key) {
    // 加密存储
    const encryptedFiles: EncryptedStoredFile[] = await Promise.all(
      files.map(async (file) => {
        const { encrypted, iv, checksum } = await encryptBlob(file, key);
        return {
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
          encryptedBlob: encrypted,
          iv,
          checksum,
        };
      })
    );

    value = {
      id,
      createdAt: Date.now(),
      files: encryptedFiles,
      encrypted: true,
    };
  } else {
    // 明文存储
    value = {
      id,
      createdAt: Date.now(),
      files: files.map((file) => ({
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        blob: file,
      })),
    };
  }

  // 先存入内存
  inMemoryStore.set(id, value);

  // 异步持久化到 IndexedDB
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

/**
 * 加载上传的文件
 * 如果文件是加密的，将自动解密
 */
export async function loadUpload(id: string): Promise<File[] | null> {
  const inMem = inMemoryStore.get(id);

  if (inMem) {
    return await recordToFiles(inMem);
  }

  const db = await getDb();
  if (!db) return null;

  const record = await new Promise<AnyStoredUpload | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as AnyStoredUpload | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });

  if (!record) return null;
  return await recordToFiles(record);
}

async function recordToFiles(record: AnyStoredUpload): Promise<File[]> {
  if (record.encrypted) {
    const key = await getEncryptionKey();
    if (!key) {
      console.warn("Encrypted files cannot be decrypted: encryption key not available");
      return [];
    }

    return await Promise.all(
      record.files.map(async (stored) => {
        try {
          const decrypted = await decryptBlob(stored.encryptedBlob, stored.iv, key, stored.type);
          return new File([decrypted], stored.name, {
            type: stored.type,
            lastModified: stored.lastModified,
          });
        } catch {
          console.warn(`Failed to decrypt file: ${stored.name}`);
          return new File([], stored.name, { type: stored.type, lastModified: stored.lastModified });
        }
      })
    );
  }

  return record.files.map(
    (stored) =>
      new File([stored.blob], stored.name, {
        type: stored.type,
        lastModified: stored.lastModified,
      })
  );
}

/**
 * 删除上传的文件
 */
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

// ============================================================================
// 加密控制
// ============================================================================

/**
 * 启用存储加密
 */
export function enableStorageEncryption(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("qwerpdf-enable-encryption", "true");
  }
}

/**
 * 禁用存储加密
 */
export function disableStorageEncryption(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("qwerpdf-enable-encryption");
  }
}

/**
 * 检查存储加密是否启用
 */
export function isStorageEncryptionEnabled(): boolean {
  return ENABLE_ENCRYPTION;
}

/**
 * 清除加密密钥 (会导致已加密的文件无法解密)
 */
export function clearEncryptionKey(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
  }
}
