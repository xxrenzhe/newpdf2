"use client";

import { useEffect, useRef } from "react";
import { savePdfEditorInput } from "@/lib/pdfEditorCache";

type UsePdfEditorFileIOOptions = {
  file: File;
  pdfLoaded: boolean;
  transferPdfBytesLimit: number;
};

export function usePdfEditorFileIO({
  file,
  pdfLoaded,
  transferPdfBytesLimit,
}: UsePdfEditorFileIOOptions) {
  const fileObjectUrlRef = useRef<string | null>(null);
  const fileBytesPromiseRef = useRef<Promise<ArrayBuffer> | null>(null);

  useEffect(() => {
    const useTransfer = file.size <= transferPdfBytesLimit;

    if (useTransfer) {
      if (fileObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(fileObjectUrlRef.current);
        } catch {
          // ignore
        }
        fileObjectUrlRef.current = null;
      }
      fileBytesPromiseRef.current = file.arrayBuffer();
      return;
    }

    fileBytesPromiseRef.current = null;
    const url = URL.createObjectURL(file);
    if (fileObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(fileObjectUrlRef.current);
      } catch {
        // ignore
      }
    }
    fileObjectUrlRef.current = url;

    return () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      if (fileObjectUrlRef.current === url) {
        fileObjectUrlRef.current = null;
      }
    };
  }, [file, transferPdfBytesLimit]);

  useEffect(() => {
    if (!pdfLoaded) return;
    let cancelled = false;
    let idleHandle: number | null = null;
    let usedIdleCallback = false;

    const scheduleSave = () => {
      const win = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

      if (typeof win.requestIdleCallback === "function") {
        usedIdleCallback = true;
        idleHandle = win.requestIdleCallback(
          () => {
            if (cancelled) return;
            void savePdfEditorInput(file).catch(() => {});
          },
          { timeout: 5000 }
        );
        return;
      }

      idleHandle = window.setTimeout(() => {
        if (cancelled) return;
        void savePdfEditorInput(file).catch(() => {});
      }, 500);
    };

    scheduleSave();

    return () => {
      cancelled = true;
      if (idleHandle === null) return;
      if (usedIdleCallback) {
        const win = window as unknown as { cancelIdleCallback?: (handle: number) => void };
        win.cancelIdleCallback?.(idleHandle);
      } else {
        window.clearTimeout(idleHandle);
      }
    };
  }, [file, pdfLoaded]);

  return {
    fileObjectUrlRef,
    fileBytesPromiseRef,
  };
}
