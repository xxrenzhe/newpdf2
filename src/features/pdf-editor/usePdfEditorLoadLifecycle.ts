"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

type Setter<T> = Dispatch<SetStateAction<T>>;
type TranslateFn = (key: string, fallback: string) => string;

type UsePdfEditorLoadLifecycleOptions = {
  t: TranslateFn;
  iframeReady: boolean;
  editorReady: boolean;
  editorBooted: boolean;
  pdfLoaded: boolean;
  busy: boolean;
  error: string;
  uploadTips: string[];
  activeLoadTokenRef: MutableRefObject<number>;
  pendingLoadTokenRef: MutableRefObject<number | null>;
  pendingLoadFileRef: MutableRefObject<File | null>;
  manualCancelTokenRef: MutableRefObject<number | null>;
  hasRealProgressRef: MutableRefObject<boolean>;
  editorFallbackTimerRef: MutableRefObject<number | null>;
  uploadProgressStartTimeoutRef: MutableRefObject<number | null>;
  uploadProgressTimerRef: MutableRefObject<number | null>;
  postToEditor: (message: unknown) => void;
  setBusy: Setter<boolean>;
  setLoadCancelled: Setter<boolean>;
  setError: Setter<string>;
  setPdfLoaded: Setter<boolean>;
  setUploadProgress: Setter<number>;
  setUploadTip: Setter<string>;
  iframeLoadTimeoutMs: number;
  editorReadyTimeoutMs: number;
  pdfLoadTimeoutMs: number;
};

export function usePdfEditorLoadLifecycle({
  t,
  iframeReady,
  editorReady,
  editorBooted,
  pdfLoaded,
  busy,
  error,
  uploadTips,
  activeLoadTokenRef,
  pendingLoadTokenRef,
  pendingLoadFileRef,
  manualCancelTokenRef,
  hasRealProgressRef,
  editorFallbackTimerRef,
  uploadProgressStartTimeoutRef,
  uploadProgressTimerRef,
  postToEditor,
  setBusy,
  setLoadCancelled,
  setError,
  setPdfLoaded,
  setUploadProgress,
  setUploadTip,
  iframeLoadTimeoutMs,
  editorReadyTimeoutMs,
  pdfLoadTimeoutMs,
}: UsePdfEditorLoadLifecycleOptions) {
  const uploadOverlayOpen = !error && !pdfLoaded && (busy || !iframeReady);

  const abortActiveLoad = useCallback(
    ({ markCancelled = false, clearError = false }: { markCancelled?: boolean; clearError?: boolean } = {}) => {
      const tokenToCancel = activeLoadTokenRef.current;
      activeLoadTokenRef.current = tokenToCancel + 1;
      pendingLoadTokenRef.current = null;
      pendingLoadFileRef.current = null;
      manualCancelTokenRef.current = markCancelled ? tokenToCancel : null;
      hasRealProgressRef.current = false;

      if (editorFallbackTimerRef.current) {
        window.clearTimeout(editorFallbackTimerRef.current);
        editorFallbackTimerRef.current = null;
      }
      if (uploadProgressStartTimeoutRef.current) {
        window.clearTimeout(uploadProgressStartTimeoutRef.current);
        uploadProgressStartTimeoutRef.current = null;
      }
      if (uploadProgressTimerRef.current) {
        window.clearInterval(uploadProgressTimerRef.current);
        uploadProgressTimerRef.current = null;
      }

      setUploadProgress(0);
      if (clearError) {
        setError("");
      }
      setPdfLoaded(false);
      setBusy(false);
      setLoadCancelled(markCancelled);
      postToEditor({ type: "cancel-load", loadToken: tokenToCancel });
    },
    [
      activeLoadTokenRef,
      editorFallbackTimerRef,
      hasRealProgressRef,
      manualCancelTokenRef,
      pendingLoadFileRef,
      pendingLoadTokenRef,
      postToEditor,
      setBusy,
      setError,
      setLoadCancelled,
      setPdfLoaded,
      setUploadProgress,
      uploadProgressStartTimeoutRef,
      uploadProgressTimerRef,
    ]
  );

  useEffect(() => {
    if (iframeReady || error || !uploadOverlayOpen) return;
    const timeoutId = window.setTimeout(() => {
      setBusy(false);
      setLoadCancelled(false);
      setError(
        t("pdfEditorIframeLoadFailed", "The editor failed to load. Please refresh and try again.")
      );
    }, iframeLoadTimeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [error, iframeLoadTimeoutMs, iframeReady, setBusy, setError, setLoadCancelled, t, uploadOverlayOpen]);

  useEffect(() => {
    if (!iframeReady || editorReady || pdfLoaded || error || !busy) return;
    const timeoutId = window.setTimeout(() => {
      if (editorBooted) return;
      abortActiveLoad();
      setError(
        t("pdfEditorLoadFailed", "The editor failed to load. Please refresh and try again.")
      );
    }, editorReadyTimeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [
    abortActiveLoad,
    busy,
    editorBooted,
    editorReady,
    editorReadyTimeoutMs,
    error,
    iframeReady,
    pdfLoaded,
    setError,
    t,
  ]);

  useEffect(() => {
    if (!busy || pdfLoaded || error) return;
    const timeoutId = window.setTimeout(() => {
      abortActiveLoad();
      setError(
        t("pdfLoadTimeout", "This PDF is taking too long to load. Please try again.")
      );
    }, pdfLoadTimeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [abortActiveLoad, busy, error, pdfLoaded, pdfLoadTimeoutMs, setError, t]);

  const cancelLoading = useCallback(() => {
    abortActiveLoad({ markCancelled: true, clearError: true });
  }, [abortActiveLoad]);

  useEffect(() => {
    if (!uploadOverlayOpen) {
      if (uploadProgressStartTimeoutRef.current) window.clearTimeout(uploadProgressStartTimeoutRef.current);
      uploadProgressStartTimeoutRef.current = null;
      if (uploadProgressTimerRef.current) window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
      setUploadProgress(0);
      return;
    }

    if (uploadTips.length > 0) {
      setUploadTip(uploadTips[Math.floor(Math.random() * uploadTips.length)] ?? uploadTips[0] ?? "");
    }
    setUploadProgress(0);

    if (uploadProgressTimerRef.current) window.clearInterval(uploadProgressTimerRef.current);
    if (uploadProgressStartTimeoutRef.current) window.clearTimeout(uploadProgressStartTimeoutRef.current);

    const started = Date.now();
    uploadProgressStartTimeoutRef.current = window.setTimeout(() => {
      if (hasRealProgressRef.current) return;
      uploadProgressTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - started;
        const timeRatio = Math.min(1, elapsed / 2800);
        const eased = 1 - Math.pow(1 - timeRatio, 3);
        const next = Math.round(eased * 95);
        setUploadProgress((prev) => (prev >= 95 ? prev : Math.max(prev, next)));
        if (next >= 95 && uploadProgressTimerRef.current) {
          window.clearInterval(uploadProgressTimerRef.current);
          uploadProgressTimerRef.current = null;
        }
      }, 100);
    }, 250);

    return () => {
      if (uploadProgressStartTimeoutRef.current) window.clearTimeout(uploadProgressStartTimeoutRef.current);
      uploadProgressStartTimeoutRef.current = null;
      if (uploadProgressTimerRef.current) window.clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    };
  }, [
    hasRealProgressRef,
    setUploadProgress,
    setUploadTip,
    uploadOverlayOpen,
    uploadProgressStartTimeoutRef,
    uploadProgressTimerRef,
    uploadTips,
  ]);

  return {
    uploadOverlayOpen,
    abortActiveLoad,
    cancelLoading,
  };
}
