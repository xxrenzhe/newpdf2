"use client";

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { downloadBlob } from "@/lib/pdf/client";
import { savePdfEditorOutput } from "@/lib/pdfEditorCache";

type PdfDownloadMessage = { type: "pdf-download"; blob: Blob };
type PdfLoadedMessage = { type: "pdf-loaded"; pageCount?: number; loadToken?: number };
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
  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      const source = editorFrameRef.current?.contentWindow;
      if (!source || evt.source !== source) return;
      const message = parseEditorMessage(evt.data);
      if (!message || message.type !== "pdf-download") return;
      setBusy(false);
      downloadBlob(message.blob, outName);
      void savePdfEditorOutput(message.blob, outName).catch(() => {});
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editorFrameRef, outName, setBusy]);

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
          hasRealProgressRef.current = false;
          manualCancelTokenRef.current = null;
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
          if (!matchesLoadToken(message.loadToken, activeLoadTokenRef.current)) return;
          hasRealProgressRef.current = false;
          const text =
            typeof message.message === "string" && message.message.trim().length > 0
              ? message.message.trim()
              : t("pdfEditorFailed", "Something went wrong in the PDF editor. Please try again.");
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
