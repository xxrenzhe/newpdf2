"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/pdf/client";
import { savePdfEditorOutput } from "@/lib/pdfEditorCache";

type PdfDownloadMessage = { type: "pdf-download"; blob: Blob };
type PdfLoadedMessage = { type: "pdf-loaded"; pageCount?: number; loadToken?: number };
type PdfRenderCompleteMessage = { type: "pdf-render-complete"; loadToken?: number };
type PdfProgressMessage = { type: "pdf-progress"; loaded: number; total?: number; loadToken?: number };
type PdfPasswordErrorMessage = { type: "pdf-password-error"; loadToken?: number };
type PdfErrorMessage = { type: "pdf-error"; message?: string; loadToken?: number };
type PdfExternalEmbedBlockedMessage = {
  type: "pdf-external-embed-blocked";
  count?: number;
  origins?: string[];
  loadToken?: number;
};
type PdfLoadCancelledMessage = { type: "pdf-load-cancelled"; loadToken?: number };
type PdfOpenToolMessage = { type: "open-tool"; tool?: string };
type PdfEditorReadyMessage = { type: "pdf-editor-ready" };
type PdfEditorMessage =
  | PdfDownloadMessage
  | PdfLoadedMessage
  | PdfRenderCompleteMessage
  | PdfProgressMessage
  | PdfPasswordErrorMessage
  | PdfErrorMessage
  | PdfExternalEmbedBlockedMessage
  | PdfLoadCancelledMessage
  | PdfOpenToolMessage
  | PdfEditorReadyMessage;

type Setter<T> = Dispatch<SetStateAction<T>>;
type TranslateFn = (key: string, fallback: string) => string;

type UsePdfEditorMessagesOptions = {
  editorFrameRef: RefObject<HTMLIFrameElement | null>;
  outName: string;
  t: TranslateFn;
  activeLoadTokenRef: MutableRefObject<number>;
  manualCancelTokenRef: MutableRefObject<number | null>;
  hasRealProgressRef: MutableRefObject<boolean>;
  blockedEmbedCountRef: MutableRefObject<number>;
  uploadProgressStartTimeoutRef: MutableRefObject<number | null>;
  uploadProgressTimerRef: MutableRefObject<number | null>;
  editorPingTimerRef: MutableRefObject<number | null>;
  editorReady: boolean;
  editorBooted: boolean;
  onOpenTool?: (toolKey: string) => void;
  onDownloadTerminal?: () => void;
  setIframeReady: Setter<boolean>;
  setEditorReady: Setter<boolean>;
  setEditorBooted: Setter<boolean>;
  setPdfLoaded: Setter<boolean>;
  setBusy: Setter<boolean>;
  setLoadCancelled: Setter<boolean>;
  setError: Setter<string>;
  setExternalEmbedWarning: Setter<string>;
  setUploadProgress: Setter<number>;
};

function getMessageRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseLoadToken(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseEditorMessage(value: unknown): PdfEditorMessage | null {
  const record = getMessageRecord(value);
  if (!record) return null;
  if (typeof record.type !== "string") return null;

  const loadToken = parseLoadToken(record.loadToken);

  switch (record.type) {
    case "pdf-download": {
      if (!(record.blob instanceof Blob)) return null;
      return { type: "pdf-download", blob: record.blob };
    }
    case "pdf-loaded":
      return {
        type: "pdf-loaded",
        pageCount: typeof record.pageCount === "number" ? record.pageCount : undefined,
        loadToken,
      };
    case "pdf-render-complete":
      return {
        type: "pdf-render-complete",
        loadToken,
      };
    case "pdf-progress": {
      if (typeof record.loaded !== "number" || !Number.isFinite(record.loaded)) return null;
      const total = typeof record.total === "number" && Number.isFinite(record.total) ? record.total : undefined;
      return {
        type: "pdf-progress",
        loaded: record.loaded,
        total,
        loadToken,
      };
    }
    case "pdf-password-error":
      return { type: "pdf-password-error", loadToken };
    case "pdf-error":
      return {
        type: "pdf-error",
        message: typeof record.message === "string" ? record.message : undefined,
        loadToken,
      };
    case "pdf-external-embed-blocked":
      return {
        type: "pdf-external-embed-blocked",
        count: typeof record.count === "number" && Number.isFinite(record.count) ? record.count : undefined,
        origins: Array.isArray(record.origins)
          ? record.origins.filter((origin): origin is string => typeof origin === "string")
          : undefined,
        loadToken,
      };
    case "pdf-load-cancelled":
      return { type: "pdf-load-cancelled", loadToken };
    case "open-tool":
      return {
        type: "open-tool",
        tool: typeof record.tool === "string" ? record.tool : undefined,
      };
    case "pdf-editor-ready":
      return { type: "pdf-editor-ready" };
    default:
      return null;
  }
}

function matchesLoadToken(loadToken: number | undefined, expectedToken: number) {
  if (typeof loadToken !== "number") return true;
  return loadToken === expectedToken;
}

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

  if (
    lower.includes("font worker") ||
    lower.includes("font subset worker")
  ) {
    return t("pdfEditorFontWorkerError", "Font processing failed while saving. Please try again.");
  }

  return text;
}

export function usePdfEditorMessages({
  editorFrameRef,
  outName,
  t,
  activeLoadTokenRef,
  manualCancelTokenRef,
  hasRealProgressRef,
  blockedEmbedCountRef,
  uploadProgressStartTimeoutRef,
  uploadProgressTimerRef,
  editorPingTimerRef,
  editorReady,
  editorBooted,
  onOpenTool,
  onDownloadTerminal,
  setIframeReady,
  setEditorReady,
  setEditorBooted,
  setPdfLoaded,
  setBusy,
  setLoadCancelled,
  setError,
  setExternalEmbedWarning,
  setUploadProgress,
}: UsePdfEditorMessagesOptions) {
  const lastErrorToastRef = useRef<{ message: string; timestamp: number } | null>(null);

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

  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      const source = editorFrameRef.current?.contentWindow;
      if (!source || evt.source !== source) return;
      const message = parseEditorMessage(evt.data);
      if (!message || message.type !== "pdf-download") return;
      onDownloadTerminal?.();
      setBusy(false);
      downloadBlob(message.blob, outName);
      void savePdfEditorOutput(message.blob, outName).catch(() => {});
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editorFrameRef, onDownloadTerminal, outName, setBusy]);

  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      const source = editorFrameRef.current?.contentWindow;
      if (!source || evt.source !== source) return;
      const message = parseEditorMessage(evt.data);
      if (!message) return;

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
          if (!editorReady) setEditorReady(true);
          if (!editorBooted) setEditorBooted(true);
          if (uploadProgressStartTimeoutRef.current) window.clearTimeout(uploadProgressStartTimeoutRef.current);
          uploadProgressStartTimeoutRef.current = null;
          if (uploadProgressTimerRef.current) window.clearInterval(uploadProgressTimerRef.current);
          uploadProgressTimerRef.current = null;
          setUploadProgress(pct);
          return;
        }
        case "pdf-password-error":
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          onDownloadTerminal?.();
          hasRealProgressRef.current = false;
          manualCancelTokenRef.current = null;
          const passwordErrorText = t(
            "pdfPasswordProtected",
            "This PDF is password protected. Please unlock it first, then re-open in the editor."
          );
          notifyError(passwordErrorText);
          setBusy(false);
          setLoadCancelled(false);
          setError(passwordErrorText);
          return;
        case "pdf-error": {
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          onDownloadTerminal?.();
          hasRealProgressRef.current = false;
          const text = normalizePdfEditorError(message.message, t);
          if (message.message && text !== message.message.trim()) {
            console.error("[pdfeditor] runtime error", message.message);
          }
          notifyError(text);
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
          const text = originLabel ? `${base} (${originLabel})` : base;
          setExternalEmbedWarning(text);
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
        case "pdf-download":
          return;
        default:
          return;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [
    activeLoadTokenRef,
    blockedEmbedCountRef,
    editorBooted,
    editorFrameRef,
    editorPingTimerRef,
    editorReady,
    hasRealProgressRef,
    manualCancelTokenRef,
    onOpenTool,
    onDownloadTerminal,
    notifyError,
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
