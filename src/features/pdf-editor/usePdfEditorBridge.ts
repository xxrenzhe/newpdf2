"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";

type Setter<T> = Dispatch<SetStateAction<T>>;

type UsePdfEditorBridgeOptions = {
  editorFrameRef: RefObject<HTMLIFrameElement | null>;
  file: File;
  iframeReady: boolean;
  editorReady: boolean;
  setError: Setter<string>;
  setPdfLoaded: Setter<boolean>;
  setLoadCancelled: Setter<boolean>;
  setBusy: Setter<boolean>;
  activeLoadTokenRef: MutableRefObject<number>;
  pendingLoadTokenRef: MutableRefObject<number | null>;
  pendingLoadFileRef: MutableRefObject<File | null>;
  manualCancelTokenRef: MutableRefObject<number | null>;
  hasRealProgressRef: MutableRefObject<boolean>;
  appliedToolRef: MutableRefObject<string | null>;
  editorFallbackTimerRef: MutableRefObject<number | null>;
  editorFallbackUsedRef: MutableRefObject<boolean>;
  editorPingTimerRef: MutableRefObject<number | null>;
  editorPingAttemptsRef: MutableRefObject<number>;
  fileObjectUrlRef: MutableRefObject<string | null>;
  fileBytesPromiseRef: MutableRefObject<Promise<ArrayBuffer> | null>;
  enableLegacyFallback: boolean;
  transferPdfBytesLimit: number;
};

export function usePdfEditorBridge({
  editorFrameRef,
  file,
  iframeReady,
  editorReady,
  setError,
  setPdfLoaded,
  setLoadCancelled,
  setBusy,
  activeLoadTokenRef,
  pendingLoadTokenRef,
  pendingLoadFileRef,
  manualCancelTokenRef,
  hasRealProgressRef,
  appliedToolRef,
  editorFallbackTimerRef,
  editorFallbackUsedRef,
  editorPingTimerRef,
  editorPingAttemptsRef,
  fileObjectUrlRef,
  fileBytesPromiseRef,
  enableLegacyFallback,
  transferPdfBytesLimit,
}: UsePdfEditorBridgeOptions) {
  const postToEditor = useCallback(
    (message: unknown, transfer?: Transferable[]) => {
      const target = editorFrameRef.current?.contentWindow;
      if (!target) return;
      if (transfer && transfer.length > 0) {
        target.postMessage(message, "*", transfer);
      } else {
        target.postMessage(message, "*");
      }
    },
    [editorFrameRef]
  );

  const sendLoadToEditor = useCallback(
    async (targetFile: File, token: number) => {
      const useTransfer = targetFile.size <= transferPdfBytesLimit;
      if (useTransfer) {
        const promise = fileBytesPromiseRef.current ?? targetFile.arrayBuffer();
        let buffer = await promise.catch(() => null);
        if (activeLoadTokenRef.current !== token) return;
        if (!buffer || buffer.byteLength === 0) {
          buffer = await targetFile.arrayBuffer().catch(() => null);
        }
        if (!buffer || buffer.byteLength === 0) {
          fileBytesPromiseRef.current = null;
          postToEditor({ type: "load-pdf", blob: targetFile, loadToken: token, fileName: targetFile.name });
          return;
        }
        postToEditor(
          { type: "load-pdf", data: buffer, blob: targetFile, loadToken: token, fileName: targetFile.name },
          [buffer]
        );
        fileBytesPromiseRef.current = null;
        return;
      }

      const url = fileObjectUrlRef.current;
      if (activeLoadTokenRef.current !== token) return;
      if (url) {
        postToEditor({ type: "load-pdf", url, blob: targetFile, loadToken: token, fileName: targetFile.name });
        return;
      }
      postToEditor({ type: "load-pdf", blob: targetFile, loadToken: token, fileName: targetFile.name });
    },
    [
      activeLoadTokenRef,
      fileBytesPromiseRef,
      fileObjectUrlRef,
      postToEditor,
      transferPdfBytesLimit,
    ]
  );

  useEffect(() => {
    if (!iframeReady) return;
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    pendingLoadTokenRef.current = token;
    pendingLoadFileRef.current = file;
    manualCancelTokenRef.current = null;
    setError("");
    setPdfLoaded(false);
    setLoadCancelled(false);
    setBusy(true);
    appliedToolRef.current = null;
    hasRealProgressRef.current = false;

    if (enableLegacyFallback) {
      editorFallbackUsedRef.current = false;
      if (editorFallbackTimerRef.current) {
        window.clearTimeout(editorFallbackTimerRef.current);
        editorFallbackTimerRef.current = null;
      }
    }

    if (!editorReady) {
      postToEditor({ type: "ping" });
      return;
    }

    pendingLoadTokenRef.current = null;
    pendingLoadFileRef.current = null;
    void sendLoadToEditor(file, token);
  }, [
    activeLoadTokenRef,
    appliedToolRef,
    editorFallbackTimerRef,
    editorFallbackUsedRef,
    editorReady,
    enableLegacyFallback,
    file,
    hasRealProgressRef,
    iframeReady,
    manualCancelTokenRef,
    pendingLoadFileRef,
    pendingLoadTokenRef,
    postToEditor,
    sendLoadToEditor,
    setBusy,
    setError,
    setLoadCancelled,
    setPdfLoaded,
  ]);

  useEffect(() => {
    if (!iframeReady) return;
    postToEditor({ type: "set-file-name", fileName: file.name });
  }, [file.name, iframeReady, postToEditor]);

  useEffect(() => {
    if (!iframeReady || editorReady) return;
    if (editorPingTimerRef.current) {
      window.clearInterval(editorPingTimerRef.current);
      editorPingTimerRef.current = null;
    }
    editorPingAttemptsRef.current = 0;
    const ping = () => {
      editorPingAttemptsRef.current += 1;
      postToEditor({ type: "ping" });
      if (editorPingAttemptsRef.current >= 10 && editorPingTimerRef.current) {
        window.clearInterval(editorPingTimerRef.current);
        editorPingTimerRef.current = null;
      }
    };
    ping();
    editorPingTimerRef.current = window.setInterval(ping, 1000);
    return () => {
      if (editorPingTimerRef.current) {
        window.clearInterval(editorPingTimerRef.current);
        editorPingTimerRef.current = null;
      }
    };
  }, [editorPingAttemptsRef, editorPingTimerRef, editorReady, iframeReady, postToEditor]);

  useEffect(() => {
    if (!enableLegacyFallback) return;
    if (!iframeReady || editorReady) {
      if (editorFallbackTimerRef.current) {
        window.clearTimeout(editorFallbackTimerRef.current);
        editorFallbackTimerRef.current = null;
      }
      return;
    }
    if (editorFallbackUsedRef.current || editorFallbackTimerRef.current) return;
    if (!pendingLoadTokenRef.current || !pendingLoadFileRef.current) return;

    editorFallbackTimerRef.current = window.setTimeout(() => {
      editorFallbackTimerRef.current = null;
      if (editorReady) return;
      const token = pendingLoadTokenRef.current;
      const pendingFile = pendingLoadFileRef.current;
      if (!token || !pendingFile) return;
      editorFallbackUsedRef.current = true;
      pendingLoadTokenRef.current = null;
      pendingLoadFileRef.current = null;
      void sendLoadToEditor(pendingFile, token);
    }, 1500);

    return () => {
      if (editorFallbackTimerRef.current) {
        window.clearTimeout(editorFallbackTimerRef.current);
        editorFallbackTimerRef.current = null;
      }
    };
  }, [
    editorFallbackTimerRef,
    editorFallbackUsedRef,
    editorReady,
    enableLegacyFallback,
    iframeReady,
    pendingLoadFileRef,
    pendingLoadTokenRef,
    sendLoadToEditor,
  ]);

  useEffect(() => {
    if (!iframeReady || !editorReady) return;
    const token = pendingLoadTokenRef.current;
    const pendingFile = pendingLoadFileRef.current;
    if (!token || !pendingFile) return;
    pendingLoadTokenRef.current = null;
    pendingLoadFileRef.current = null;
    void sendLoadToEditor(pendingFile, token);
  }, [editorReady, iframeReady, pendingLoadFileRef, pendingLoadTokenRef, sendLoadToEditor]);

  return {
    postToEditor,
  };
}
