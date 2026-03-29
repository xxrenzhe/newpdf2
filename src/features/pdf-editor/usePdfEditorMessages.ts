"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/pdf/client";
import { savePdfEditorOutput } from "@/lib/pdfEditorCache";
import {
  matchesEditorSessionId,
  matchesLoadToken,
  matchesRequestId,
  parseEditorMessage,
} from "@/features/pdf-editor/pdfEditorProtocol";

type Setter<T> = Dispatch<SetStateAction<T>>;
type TranslateFn = (key: string, fallback: string) => string;

type UsePdfEditorMessagesOptions = {
  editorFrameRef: RefObject<HTMLIFrameElement | null>;
  expectedOrigin: string | null;
  editorSessionId: string;
  activeRequestIdRef: MutableRefObject<string | null>;
  outName: string;
  t: TranslateFn;
  activeLoadTokenRef: MutableRefObject<number>;
  manualCancelTokenRef: MutableRefObject<number | null>;
  hasRealProgressRef: MutableRefObject<boolean>;
  blockedEmbedCountRef: MutableRefObject<number>;
  uploadProgressStartTimeoutRef: MutableRefObject<number | null>;
  uploadProgressTimerRef: MutableRefObject<number | null>;
  editorPingTimerRef: MutableRefObject<number | null>;
  onAnyValidMessage?: () => void;
  onOpenTool?: (toolKey: string) => void;
  onDownloadTerminal?: () => void;
  onDownloadError?: () => void;
  setIframeReady: Setter<boolean>;
  setEditorReady: Setter<boolean>;
  setEditorBooted: Setter<boolean>;
  setPdfLoaded: Setter<boolean>;
  setBusy: Setter<boolean>;
  setLoadCancelled: Setter<boolean>;
  setError: Setter<string>;
  setExternalEmbedWarning: Setter<string>;
  setUploadProgress: Setter<number>;
  onSaveProgressHint?: (phase: string) => void;
  onHealthCheckAck?: () => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
};

function normalizePdfEditorError(rawMessage: string | undefined, t: TranslateFn) {
  const text = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!text) {
    return t("pdfEditorFailed", "Something went wrong in the PDF editor. Please try again.");
  }

  const lower = text.toLowerCase();

  if (
    lower.includes("out of memory") ||
    lower.includes("allocation failed") ||
    lower.includes("array buffer allocation failed")
  ) {
    return t(
      "pdfEditorOutOfMemory",
      "This PDF is too large for available browser memory. Try closing other tabs or using a smaller file."
    );
  }

  if (
    lower.includes("password") ||
    lower.includes("encrypted") ||
    lower.includes("passwordexception")
  ) {
    return t(
      "pdfPasswordProtected",
      "This PDF is password protected. Please unlock it first, then re-open in the editor."
    );
  }

  if (
    lower.includes("invalid pdf") ||
    lower.includes("formaterror") ||
    lower.includes("xref") ||
    lower.includes("corrupt")
  ) {
    return t(
      "pdfEditorCorrupted",
      "This PDF appears damaged or unsupported. Please repair the file or try another document."
    );
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("fallback font request timeout")
  ) {
    return t("pdfEditorNetworkError", "Network error while loading editor resources. Please try again.");
  }

  if (lower.includes("font worker") || lower.includes("font subset worker")) {
    return t("pdfEditorFontWorkerError", "Font processing failed while saving. Please try again.");
  }

  return text;
}

export function usePdfEditorMessages({
  editorFrameRef,
  expectedOrigin,
  editorSessionId,
  activeRequestIdRef,
  outName,
  t,
  activeLoadTokenRef,
  manualCancelTokenRef,
  hasRealProgressRef,
  blockedEmbedCountRef,
  uploadProgressStartTimeoutRef,
  uploadProgressTimerRef,
  editorPingTimerRef,
  onAnyValidMessage,
  onOpenTool,
  onDownloadTerminal,
  onDownloadError,
  setIframeReady,
  setEditorReady,
  setEditorBooted,
  setPdfLoaded,
  setBusy,
  setLoadCancelled,
  setError,
  setExternalEmbedWarning,
  setUploadProgress,
  onSaveProgressHint,
  onHealthCheckAck,
  onDirtyStateChange,
}: UsePdfEditorMessagesOptions) {
  const lastErrorToastRef = useRef<{ message: string; timestamp: number } | null>(null);
  const lastWarningToastRef = useRef<{ message: string; timestamp: number } | null>(null);

  const notifyError = useCallback((message: string) => {
    const text = message.trim();
    if (!text) return;
    const now = Date.now();
    const previous = lastErrorToastRef.current;
    if (previous && previous.message === text && now - previous.timestamp < 1500) {
      return;
    }
    lastErrorToastRef.current = { message: text, timestamp: now };
    toast.error(text);
  }, []);

  const notifyWarning = useCallback((message: string) => {
    const text = message.trim();
    if (!text) return;
    const now = Date.now();
    const previous = lastWarningToastRef.current;
    if (previous && previous.message === text && now - previous.timestamp < 1500) {
      return;
    }
    lastWarningToastRef.current = { message: text, timestamp: now };
    toast.warning(text);
  }, []);

  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      const source = editorFrameRef.current?.contentWindow;
      if (!source || evt.source !== source) return;
      if (!expectedOrigin || evt.origin !== expectedOrigin) return;

      const message = parseEditorMessage(evt.data);
      if (!message) return;
      if (!matchesEditorSessionId(message.editorSessionId, editorSessionId)) return;

      onAnyValidMessage?.();

      switch (message.type) {
        case "pdf-editor-ready":
          setIframeReady(true);
          setEditorReady(true);
          setEditorBooted(true);
          if (editorPingTimerRef.current) {
            window.clearInterval(editorPingTimerRef.current);
            editorPingTimerRef.current = null;
          }
          return;
        case "pdf-loaded":
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          hasRealProgressRef.current = false;
          setEditorReady(true);
          setEditorBooted(true);
          setUploadProgress((prev) => Math.max(prev, 98));
          return;
        case "pdf-render-complete":
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          hasRealProgressRef.current = false;
          if (uploadProgressStartTimeoutRef.current) window.clearTimeout(uploadProgressStartTimeoutRef.current);
          uploadProgressStartTimeoutRef.current = null;
          if (uploadProgressTimerRef.current) window.clearInterval(uploadProgressTimerRef.current);
          uploadProgressTimerRef.current = null;
          setUploadProgress(100);
          setPdfLoaded(true);
          setEditorReady(true);
          setEditorBooted(true);
          setBusy(false);
          setLoadCancelled(false);
          manualCancelTokenRef.current = null;
          setError("");
          return;
        case "pdf-progress": {
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          const total = typeof message.total === "number" ? message.total : 0;
          if (!Number.isFinite(total) || total <= 0) return;

          const ratio = Math.max(0, Math.min(1, message.loaded / total));
          const pct = Math.min(95, Math.round(ratio * 95));
          hasRealProgressRef.current = true;
          setEditorReady(true);
          setEditorBooted(true);
          if (uploadProgressStartTimeoutRef.current) window.clearTimeout(uploadProgressStartTimeoutRef.current);
          uploadProgressStartTimeoutRef.current = null;
          if (uploadProgressTimerRef.current) window.clearInterval(uploadProgressTimerRef.current);
          uploadProgressTimerRef.current = null;
          setUploadProgress(pct);
          return;
        }
        case "pdf-password-error":
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          hasRealProgressRef.current = false;
          manualCancelTokenRef.current = null;
          notifyError(
            t(
              "pdfPasswordProtected",
              "This PDF is password protected. Please unlock it first, then re-open in the editor."
            )
          );
          setBusy(false);
          setLoadCancelled(false);
          setError(
            t(
              "pdfPasswordProtected",
              "This PDF is password protected. Please unlock it first, then re-open in the editor."
            )
          );
          return;
        case "pdf-error": {
          const isRequestError = matchesRequestId(message.requestId, activeRequestIdRef.current);
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) {
            if (!isRequestError) return;
          }
          const text = normalizePdfEditorError(message.message, t);
          if (message.message && text !== message.message.trim()) {
            console.warn("[pdfeditor] runtime error", message.message);
          }
          notifyError(text);
          hasRealProgressRef.current = false;
          if (isRequestError) {
            onDownloadError?.();
          }
          setBusy(false);
          setLoadCancelled(false);
          setError(text);
          return;
        }
        case "pdf-external-embed-blocked": {
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          const count = typeof message.count === "number" ? message.count : 0;
          if (count <= blockedEmbedCountRef.current) return;
          blockedEmbedCountRef.current = count;

          const origins =
            Array.isArray(message.origins)
              ? message.origins.filter((origin) => typeof origin === "string" && origin.trim().length > 0)
              : [];
          const originLabel = origins.slice(0, 3).join(", ");
          const base = t(
            "pdfExternalEmbedsBlocked",
            "External content in this PDF was blocked for security. The editor should still work."
          );
          setExternalEmbedWarning(originLabel ? `${base} (${originLabel})` : base);
          return;
        }
        case "pdf-font-fallback": {
          const hasRequestId = typeof message.requestId === "string" && message.requestId.trim().length > 0;
          if (hasRequestId && !matchesRequestId(message.requestId, activeRequestIdRef.current)) return;
          const fonts =
            Array.isArray(message.fonts)
              ? message.fonts
                  .filter((font) => typeof font === "string" && font.trim().length > 0)
                  .map((font) => font.trim())
                  .slice(0, 3)
              : [];
          const count = typeof message.count === "number" && message.count > 0 ? message.count : fonts.length;
          const base = t(
            "pdfFontFallbackWarning",
            "Some fonts in this PDF were unavailable or restricted. Safe fallback fonts were used for export."
          );
          const suffix = fonts.length > 0 ? ` (${fonts.join(", ")})` : count > 1 ? ` (${count})` : "";
          notifyWarning(`${base}${suffix}`);
          return;
        }
        case "pdf-load-cancelled": {
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          hasRealProgressRef.current = false;
          const cancelledToken = message.loadToken;
          const manualToken = manualCancelTokenRef.current;
          const wasManual =
            manualToken !== null && (typeof cancelledToken !== "number" || cancelledToken === manualToken);
          if (wasManual) {
            manualCancelTokenRef.current = null;
          }
          setBusy(false);
          setPdfLoaded(false);
          setLoadCancelled(wasManual);
          return;
        }
        case "open-tool": {
          const toolKey = message.tool;
          if (typeof toolKey === "string" && toolKey.trim().length > 0) {
            onOpenTool?.(toolKey);
          }
          return;
        }
        case "pdf-save-progress":
          if (!matchesRequestId(message.requestId, activeRequestIdRef.current)) return;
          onSaveProgressHint?.(message.phase);
          return;
        case "health-check-ack":
          onHealthCheckAck?.();
          return;
        case "pdf-dirty-state":
          onDirtyStateChange?.(message.isDirty);
          return;
        case "pdf-download":
          if (!matchesRequestId(message.requestId, activeRequestIdRef.current)) return;
          onDownloadTerminal?.();
          setBusy(false);
          downloadBlob(message.blob, outName);
          void savePdfEditorOutput(message.blob, outName).catch(() => {});
          return;
        default:
          return;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [
    activeLoadTokenRef,
    activeRequestIdRef,
    blockedEmbedCountRef,
    editorFrameRef,
    editorPingTimerRef,
    editorSessionId,
    expectedOrigin,
    hasRealProgressRef,
    manualCancelTokenRef,
    notifyError,
    notifyWarning,
    onAnyValidMessage,
    onDownloadError,
    onDownloadTerminal,
    onDirtyStateChange,
    onHealthCheckAck,
    onOpenTool,
    onSaveProgressHint,
    outName,
    setBusy,
    setEditorBooted,
    setEditorReady,
    setError,
    setExternalEmbedWarning,
    setIframeReady,
    setLoadCancelled,
    setPdfLoaded,
    setUploadProgress,
    t,
    uploadProgressStartTimeoutRef,
    uploadProgressTimerRef,
  ]);
}
