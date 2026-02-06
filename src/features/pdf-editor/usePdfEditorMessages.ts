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

function isPdfDownloadMessage(value: unknown): value is PdfDownloadMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === "pdf-download" && record.blob instanceof Blob;
}

function hasMessageType<T extends string>(value: unknown, type: T): value is { type: T } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === type;
}

function matchesLoadToken(value: unknown, expectedToken: number) {
  if (!value || typeof value !== "object") return true;
  const record = value as Record<string, unknown>;
  if (typeof record.loadToken !== "number") return true;
  return record.loadToken === expectedToken;
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
      if (!isPdfDownloadMessage(evt.data)) return;
      setBusy(false);
      downloadBlob(evt.data.blob, outName);
      void savePdfEditorOutput(evt.data.blob, outName).catch(() => {});
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editorFrameRef, outName, setBusy]);

  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      const source = editorFrameRef.current?.contentWindow;
      if (!source || evt.source !== source) return;

      if (hasMessageType<PdfEditorReadyMessage["type"]>(evt.data, "pdf-editor-ready")) {
        setIframeReady(true);
        setEditorReady(true);
        setEditorBooted(true);
        if (editorPingTimerRef.current) {
          window.clearInterval(editorPingTimerRef.current);
          editorPingTimerRef.current = null;
        }
        return;
      }

      if (hasMessageType<PdfLoadedMessage["type"]>(evt.data, "pdf-loaded")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        hasRealProgressRef.current = false;
        setPdfLoaded(true);
        setEditorReady(true);
        setEditorBooted(true);
        setBusy(false);
        setLoadCancelled(false);
        manualCancelTokenRef.current = null;
        setError("");
        return;
      }

      if (hasMessageType<PdfProgressMessage["type"]>(evt.data, "pdf-progress")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        const data = evt.data as PdfProgressMessage;
        if (!Number.isFinite(data.loaded)) return;
        const total = typeof data.total === "number" ? data.total : 0;
        if (!Number.isFinite(total) || total <= 0) return;

        const ratio = Math.max(0, Math.min(1, data.loaded / total));
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

      if (hasMessageType<PdfPasswordErrorMessage["type"]>(evt.data, "pdf-password-error")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
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
      }

      if (hasMessageType<PdfErrorMessage["type"]>(evt.data, "pdf-error")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        hasRealProgressRef.current = false;
        const rawMessage = (evt.data as PdfErrorMessage).message;
        const message =
          typeof rawMessage === "string" && rawMessage.trim().length > 0
            ? rawMessage.trim()
            : t("pdfEditorFailed", "Something went wrong in the PDF editor. Please try again.");
        setBusy(false);
        setLoadCancelled(false);
        setError(message);
        return;
      }

      if (hasMessageType<PdfExternalEmbedBlockedMessage["type"]>(evt.data, "pdf-external-embed-blocked")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        const payload = evt.data as PdfExternalEmbedBlockedMessage;
        const count = typeof payload.count === "number" ? payload.count : 0;
        if (count <= blockedEmbedCountRef.current) return;
        blockedEmbedCountRef.current = count;

        const origins = Array.isArray(payload.origins)
          ? payload.origins.filter((origin) => typeof origin === "string" && origin.trim().length > 0)
          : [];
        const originLabel = origins.slice(0, 3).join(", ");
        const base = t(
          "pdfExternalEmbedsBlocked",
          "External content in this PDF was blocked for security. The editor should still work."
        );
        const message = originLabel ? `${base} (${originLabel})` : base;
        setExternalEmbedWarning(message);
        return;
      }

      if (hasMessageType<PdfLoadCancelledMessage["type"]>(evt.data, "pdf-load-cancelled")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        hasRealProgressRef.current = false;
        const cancelledToken = (evt.data as PdfLoadCancelledMessage).loadToken;
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

      if (hasMessageType<PdfOpenToolMessage["type"]>(evt.data, "open-tool")) {
        const toolKey = (evt.data as PdfOpenToolMessage).tool;
        if (typeof toolKey === "string" && toolKey.trim().length > 0) {
          onOpenTool?.(toolKey);
        }
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
