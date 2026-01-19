"use client";

let cachedWritable: Promise<boolean> | null = null;

export function isIndexedDbWritable(): Promise<boolean> {
  if (cachedWritable) return cachedWritable;

  cachedWritable = new Promise<boolean>((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(false);
      return;
    }

    const dbName = "files-editor-storage-check";
    const storeName = "t";

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(dbName, 1);
    } catch {
      resolve(false);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      let finished = false;

      const done = (ok: boolean) => {
        if (finished) return;
        finished = true;
        try {
          db.close();
        } catch {
          // ignore
        }
        try {
          indexedDB.deleteDatabase(dbName);
        } catch {
          // ignore
        }
        resolve(ok);
      };

      try {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => done(true);
        tx.onerror = () => done(false);
        tx.onabort = () => done(false);
        tx.objectStore(storeName).put(1, "ok");
      } catch {
        done(false);
      }
    };
  });

  return cachedWritable;
}

