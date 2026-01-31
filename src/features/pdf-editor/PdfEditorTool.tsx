"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "@/components/AppLink";
import { downloadBlob } from "@/lib/pdf/client";
import { savePdfEditorInput, savePdfEditorOutput } from "@/lib/pdfEditorCache";
import { useLanguage } from "@/components/LanguageProvider";

type PdfDownloadMessage = { type: "pdf-download"; blob: Blob };
type PdfLoadedMessage = { type: "pdf-loaded"; pageCount?: number; loadToken?: number };
type PdfProgressMessage = { type: "pdf-progress"; loaded: number; total?: number; loadToken?: number };
type PdfPasswordErrorMessage = { type: "pdf-password-error"; loadToken?: number };
type PdfErrorMessage = { type: "pdf-error"; message?: string; loadToken?: number };
type PdfLoadCancelledMessage = { type: "pdf-load-cancelled"; loadToken?: number };
type PdfOpenToolMessage = { type: "open-tool"; tool?: string };
type PdfEditorReadyMessage = { type: "pdf-editor-ready" };

const TRANSFER_PDF_BYTES_LIMIT = 32 * 1024 * 1024; // 32MB
const EDITOR_READY_TIMEOUT_MS = 12000;
const PDF_LOAD_TIMEOUT_MS = 60000;
const IFRAME_LOAD_TIMEOUT_MS = 15000;

function UploadProgressOverlay({
  open,
  progress,
  tip,
  onCancel,
}: {
  open: boolean;
  progress: number;
  tip: string;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  if (!open) return null;
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("uploadProgressLabel", "Upload progress")}
    >
      <div className="w-[min(840px,calc(100vw-2rem))] rounded-2xl bg-white shadow-2xl border border-[color:var(--brand-line)] p-8">
        <h2 className="text-3xl font-semibold text-[color:var(--brand-ink)]">
          {t("loadingPleaseWait", "Loading, please wait…")}
        </h2>
        <div className="mt-5 h-2 w-full rounded-full bg-[color:var(--brand-lilac)] overflow-hidden" role="progressbar" aria-valuenow={clamped}>
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${clamped}%` }}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-[color:var(--brand-line)] bg-[color:var(--brand-cream)] p-6 flex items-start gap-5">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-white border border-[color:var(--brand-line)] flex items-center justify-center text-primary">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M9 14l2 2 4-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-line)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--brand-ink)]">
              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-[color:var(--brand-lilac)] text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 18h6m-4 3h2m-6-10a5 5 0 1 1 10 0c0 2-1 3-2 4s-1 2-1 3h-4c0-1 0-2-1-3s-2-2-2-4Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {t("productivityTip", "Productivity tip")}
            </div>
            <p className="mt-4 text-[color:var(--brand-muted)] text-base leading-relaxed">{tip}</p>
          </div>
        </div>

        {onCancel ? (
          <div className="mt-7 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
              onClick={onCancel}
            >
              {t("cancel", "Cancel")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isPdfDownloadMessage(value: unknown): value is PdfDownloadMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.type === "pdf-download" && v.blob instanceof Blob;
}

function hasMessageType<T extends string>(value: unknown, type: T): value is { type: T } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.type === type;
}

function matchesLoadToken(value: unknown, expectedToken: number) {
  if (!value || typeof value !== "object") return true;
  const v = value as Record<string, unknown>;
  if (typeof v.loadToken !== "number") return true;
  return v.loadToken === expectedToken;
}

export default function PdfEditorTool({
  file,
  onBack,
  onReplaceFile,
  onOpenTool,
  variant = "card",
  showChangeFile = true,
  initialTool,
  showBrand = false,
  toolSwitcher,
  actionsPosition = "inline",
}: {
  file: File;
  onBack: () => void;
  onReplaceFile: (file: File) => void;
  onOpenTool?: (toolKey: string) => void;
  variant?: "card" | "shell";
  showChangeFile?: boolean;
  initialTool?: string | null;
  showBrand?: boolean;
  toolSwitcher?: React.ReactNode;
  actionsPosition?: "inline" | "top-right";
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileObjectUrlRef = useRef<string | null>(null);
  const fileBytesPromiseRef = useRef<Promise<ArrayBuffer> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeLoadTokenRef = useRef(0);
  const fileInputId = useId();
  const { t, lang } = useLanguage();
  const uploadTips = useMemo(
    () => [
      t("uploadTipPreparing", "Uploading and preparing your document. Optimizing for editing…"),
      t("uploadTipEditor", "Preparing the editor. This usually takes only a moment."),
      t("uploadTipLarge", "Tip: Larger PDFs may take a bit longer to load - thanks for your patience."),
    ],
    [t]
  );
  const [iframeReady, setIframeReady] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editorBooted, setEditorBooted] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadCancelled, setLoadCancelled] = useState(false);
  const appliedToolRef = useRef<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTip, setUploadTip] = useState(uploadTips[0] ?? "");
  const uploadProgressTimerRef = useRef<number | null>(null);
  const uploadProgressStartTimeoutRef = useRef<number | null>(null);
  const hasRealProgressRef = useRef(false);
  const pendingLoadTokenRef = useRef<number | null>(null);
  const pendingLoadFileRef = useRef<File | null>(null);
  const editorPingTimerRef = useRef<number | null>(null);
  const editorPingAttemptsRef = useRef(0);
  const editorFallbackTimerRef = useRef<number | null>(null);
  const editorFallbackUsedRef = useRef(false);
  const compatPollTimerRef = useRef<number | null>(null);
  const compatPollTokenRef = useRef<number | null>(null);
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (lang) params.set("lang", lang);
    const qs = params.toString();
    return qs ? `/pdfeditor/index.html?${qs}#embed` : "/pdfeditor/index.html#embed";
  }, [lang]);

  const outName = useMemo(() => file.name.replace(/\.[^.]+$/, "") + "-edited.pdf", [file.name]);

  useEffect(() => {
    setUploadTip(uploadTips[0] ?? "");
  }, [uploadTips]);

  useEffect(() => {
    setIframeReady(false);
    setEditorReady(false);
    setEditorBooted(false);
    setPdfLoaded(false);
    setLoadCancelled(false);
    setBusy(false);
    setError("");
    pendingLoadTokenRef.current = null;
    pendingLoadFileRef.current = null;
    editorFallbackUsedRef.current = false;
    if (editorFallbackTimerRef.current) {
      window.clearTimeout(editorFallbackTimerRef.current);
      editorFallbackTimerRef.current = null;
    }
    if (editorPingTimerRef.current) {
      window.clearInterval(editorPingTimerRef.current);
      editorPingTimerRef.current = null;
    }
    if (compatPollTimerRef.current) {
      window.clearInterval(compatPollTimerRef.current);
      compatPollTimerRef.current = null;
    }
    compatPollTokenRef.current = null;
  }, [iframeSrc]);

  const postToEditor = useCallback((message: unknown, transfer?: Transferable[]) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    if (transfer && transfer.length > 0) {
      win.postMessage(message, "*", transfer);
    } else {
      win.postMessage(message, "*");
    }
  }, []);

  const sendLoadToEditor = useCallback(
    async (targetFile: File, token: number) => {
      const useTransfer = targetFile.size <= TRANSFER_PDF_BYTES_LIMIT;
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
    [postToEditor]
  );

  const detectEditorBooted = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return false;
    try {
      const doc = iframe.contentDocument;
      return Boolean(doc?.getElementById("pdf-main"));
    } catch {
      return false;
    }
  }, []);

  const detectPdfLoadedFromIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return false;
    try {
      const win = iframe.contentWindow as (Window & {
        reader?: { pdfDocument?: { pageCount?: number; numPages?: number }; pageCount?: number };
      }) | null;
      const reader = win?.reader;
      const pageCount = reader?.pdfDocument?.pageCount ?? reader?.pdfDocument?.numPages ?? reader?.pageCount;
      if (typeof pageCount === "number" && pageCount > 0) return true;
      const doc = iframe.contentDocument;
      if (doc?.querySelector("#pdf-main .__pdf_page_preview")) return true;
    } catch {
      // ignore
    }
    return false;
  }, []);

  const injectMobileOverrides = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.documentElement.classList.add("embed");
      if (!doc.getElementById("pdfeditor-mobile-overrides")) {
        const link = doc.createElement("link");
        link.id = "pdfeditor-mobile-overrides";
        link.rel = "stylesheet";
        link.href = "/pdfeditor-mobile.css";
        doc.head?.appendChild(link);
      }
    } catch {
      // Ignore cross-origin access errors.
    }
  }, []);

  useEffect(() => {
    const useTransfer = file.size <= TRANSFER_PDF_BYTES_LIMIT;

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
  }, [file]);

  useEffect(() => {
    if (!pdfLoaded) return;
    let cancelled = false;
    let idleHandle: number | null = null;
    let usedIdleCallback = false;

    const schedule = () => {
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      };
      if (typeof w.requestIdleCallback === "function") {
        usedIdleCallback = true;
        idleHandle = w.requestIdleCallback(() => {
          if (cancelled) return;
          void savePdfEditorInput(file).catch(() => {});
        }, { timeout: 5000 });
        return;
      }

      idleHandle = window.setTimeout(() => {
        if (cancelled) return;
        void savePdfEditorInput(file).catch(() => {});
      }, 500);
    };

    schedule();
    return () => {
      cancelled = true;
      if (idleHandle === null) return;
      if (usedIdleCallback) {
        const w = window as unknown as { cancelIdleCallback?: (handle: number) => void };
        w.cancelIdleCallback?.(idleHandle);
      } else {
        window.clearTimeout(idleHandle);
      }
    };
  }, [file, pdfLoaded]);

  useEffect(() => {
    if (!iframeReady) return;
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    pendingLoadTokenRef.current = token;
    pendingLoadFileRef.current = file;
    setError("");
    setPdfLoaded(false);
    setLoadCancelled(false);
    setBusy(true);
    appliedToolRef.current = null;
    hasRealProgressRef.current = false;
    editorFallbackUsedRef.current = false;
    if (editorFallbackTimerRef.current) {
      window.clearTimeout(editorFallbackTimerRef.current);
      editorFallbackTimerRef.current = null;
    }

    if (!editorReady) {
      postToEditor({ type: "ping" });
      return;
    }

    pendingLoadTokenRef.current = null;
    pendingLoadFileRef.current = null;
    void sendLoadToEditor(file, token);
  }, [editorReady, file, iframeReady, postToEditor, sendLoadToEditor]);

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
  }, [editorReady, iframeReady, postToEditor]);

  useEffect(() => {
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
  }, [editorReady, iframeReady, sendLoadToEditor]);

  useEffect(() => {
    if (!iframeReady || !editorReady) return;
    const token = pendingLoadTokenRef.current;
    const pendingFile = pendingLoadFileRef.current;
    if (!token || !pendingFile) return;
    pendingLoadTokenRef.current = null;
    pendingLoadFileRef.current = null;
    void sendLoadToEditor(pendingFile, token);
  }, [editorReady, iframeReady, sendLoadToEditor]);

  const uploadOverlayOpen = !error && !pdfLoaded && (busy || !iframeReady);

  useEffect(() => {
    if (iframeReady || error || !uploadOverlayOpen) return;
    const timeoutId = window.setTimeout(() => {
      setBusy(false);
      setLoadCancelled(false);
      setError(
        t("pdfEditorIframeLoadFailed", "The editor failed to load. Please refresh and try again.")
      );
    }, IFRAME_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [error, iframeReady, t, uploadOverlayOpen]);

  useEffect(() => {
    if (!iframeReady || editorReady || pdfLoaded || error || !busy) return;
    const timeoutId = window.setTimeout(() => {
      if (editorBooted) return;
      setBusy(false);
      setLoadCancelled(false);
      setError(
        t("pdfEditorLoadFailed", "The editor failed to load. Please refresh and try again.")
      );
    }, EDITOR_READY_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [busy, editorBooted, editorReady, error, iframeReady, pdfLoaded, t]);

  useEffect(() => {
    if (!busy || pdfLoaded || error) return;
    const timeoutId = window.setTimeout(() => {
      setBusy(false);
      setLoadCancelled(false);
      setError(
        t("pdfLoadTimeout", "This PDF is taking too long to load. Please try again.")
      );
    }, PDF_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [busy, error, pdfLoaded, t]);

  useEffect(() => {
    if (!iframeReady || !busy || pdfLoaded || error) {
      if (compatPollTimerRef.current) {
        window.clearInterval(compatPollTimerRef.current);
        compatPollTimerRef.current = null;
      }
      compatPollTokenRef.current = null;
      return;
    }

    const token = activeLoadTokenRef.current;
    compatPollTokenRef.current = token;
    if (compatPollTimerRef.current) {
      window.clearInterval(compatPollTimerRef.current);
      compatPollTimerRef.current = null;
    }

    const startedAt = Date.now();
    compatPollTimerRef.current = window.setInterval(() => {
      if (compatPollTokenRef.current !== token) {
        if (compatPollTimerRef.current) {
          window.clearInterval(compatPollTimerRef.current);
          compatPollTimerRef.current = null;
        }
        return;
      }
      if (detectPdfLoadedFromIframe()) {
        setEditorReady(true);
        setEditorBooted(true);
        setPdfLoaded(true);
        setBusy(false);
        setLoadCancelled(false);
        setError("");
        if (compatPollTimerRef.current) {
          window.clearInterval(compatPollTimerRef.current);
          compatPollTimerRef.current = null;
        }
        compatPollTokenRef.current = null;
        return;
      }
      if (Date.now() - startedAt > 20000 && compatPollTimerRef.current) {
        window.clearInterval(compatPollTimerRef.current);
        compatPollTimerRef.current = null;
      }
    }, 500);

    return () => {
      if (compatPollTimerRef.current) {
        window.clearInterval(compatPollTimerRef.current);
        compatPollTimerRef.current = null;
      }
      compatPollTokenRef.current = null;
    };
  }, [busy, detectPdfLoadedFromIframe, error, iframeReady, pdfLoaded]);

  const cancelLoading = useCallback(() => {
    const tokenToCancel = activeLoadTokenRef.current;
    activeLoadTokenRef.current = tokenToCancel + 1;
    pendingLoadTokenRef.current = null;
    pendingLoadFileRef.current = null;
    hasRealProgressRef.current = false;
    setUploadProgress(0);
    setError("");
    setPdfLoaded(false);
    setBusy(false);
    setLoadCancelled(true);
    postToEditor({ type: "cancel-load", loadToken: tokenToCancel });
  }, [postToEditor]);

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
        const t = Math.min(1, elapsed / 2800);
        const eased = 1 - Math.pow(1 - t, 3);
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
  }, [uploadOverlayOpen, uploadTips]);

  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      if (evt.source !== iframeRef.current?.contentWindow) return;
      if (!isPdfDownloadMessage(evt.data)) return;
      setBusy(false);
      downloadBlob(evt.data.blob, outName);
      void savePdfEditorOutput(evt.data.blob, outName).catch(() => {});
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [outName]);

  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
      if (evt.source !== iframeRef.current?.contentWindow) return;
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
        setError("");
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
      }
      if (hasMessageType<PdfPasswordErrorMessage["type"]>(evt.data, "pdf-password-error")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        hasRealProgressRef.current = false;
        setBusy(false);
        setLoadCancelled(false);
        setError(
          t(
            "pdfPasswordProtected",
            "This PDF is password protected. Please unlock it first, then re-open in the editor."
          )
        );
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
      }
      if (hasMessageType<PdfLoadCancelledMessage["type"]>(evt.data, "pdf-load-cancelled")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        hasRealProgressRef.current = false;
        setBusy(false);
        setPdfLoaded(false);
        setLoadCancelled(true);
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
  }, [onOpenTool, t]);

  useEffect(() => {
    if (!pdfLoaded) return;
    if (!initialTool) return;
    if (appliedToolRef.current === initialTool) return;
    postToEditor({ type: "set-tool", tool: initialTool });
    appliedToolRef.current = initialTool;
  }, [initialTool, pdfLoaded, postToEditor]);

  const requestDownload = useCallback(() => {
    if (!pdfLoaded) return;
    setError("");
    setBusy(true);
    postToEditor({ type: "download" });
  }, [pdfLoaded, postToEditor]);

  const onFileChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const next = evt.target.files?.[0] ?? null;
      evt.target.value = "";
      if (!next) return;
      setError("");
      setPdfLoaded(false);
      setBusy(true);
      onReplaceFile(next);
    },
    [onReplaceFile]
  );

  const shellClassName =
    variant === "shell"
      ? "bg-white overflow-hidden flex flex-col h-screen h-[100dvh]"
      : "bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm overflow-hidden";

  const viewerShellClassName =
    variant === "shell"
      ? "flex-1 min-h-0 bg-white"
      : "h-[75vh] min-h-[560px] bg-white";

  const viewerClassName =
    actionsPosition === "top-right"
      ? `${viewerShellClassName} pt-2`
      : viewerShellClassName;

  const headerClassName =
    actionsPosition === "top-right"
      ? "flex flex-col gap-3 px-4 py-3 min-h-[64px] bg-white/80 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6"
      : "flex flex-col gap-4 px-4 py-4 min-h-[72px] border-b border-[color:var(--brand-line)] bg-white/80 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5";

  const titleClassName = "min-w-0 flex items-center gap-3 w-full sm:w-auto";

  const actionsClassName = "flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-nowrap sm:justify-end";

  const secondaryActionClassName =
    actionsPosition === "top-right"
      ? "inline-flex items-center justify-center h-9 px-3 text-xs rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] whitespace-nowrap sm:h-10 sm:px-4 sm:text-sm"
      : "inline-flex items-center justify-center h-10 px-4 text-xs rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] whitespace-nowrap sm:h-11 sm:px-5 sm:text-sm";

  const primaryActionClassName =
    actionsPosition === "top-right"
      ? "inline-flex items-center justify-center h-9 px-3 text-xs rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 whitespace-nowrap sm:h-10 sm:px-4 sm:text-sm"
      : "inline-flex items-center justify-center h-10 px-4 text-xs rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 whitespace-nowrap sm:h-11 sm:px-5 sm:text-sm";

  const statusText = busy
    ? t("statusWorking", "Working…")
    : pdfLoaded
      ? t("statusReady", "Ready")
      : loadCancelled
        ? t("statusCanceled", "Canceled")
        : iframeReady
          ? t("statusWaiting", "Waiting…")
          : t("statusLoading", "Loading…");

  const handleIframeLoad = useCallback(() => {
    injectMobileOverrides();
    setIframeReady(true);
    setEditorReady(false);
    if (detectEditorBooted()) {
      setEditorBooted(true);
    }
    if (editorPingTimerRef.current) {
      window.clearInterval(editorPingTimerRef.current);
      editorPingTimerRef.current = null;
    }
  }, [detectEditorBooted, injectMobileOverrides]);

  return (
    <div className={shellClassName}>
      <UploadProgressOverlay
        open={uploadOverlayOpen}
        progress={uploadProgress}
        tip={uploadTip}
        onCancel={busy ? cancelLoading : undefined}
      />
      <div className={headerClassName}>
        <div className={titleClassName}>
          {showBrand ? (
            <Link href="/" className="flex items-center self-center leading-none">
              <img src="/logo.png" alt="QwerPDF" width={982} height={167} className="h-6 md:h-7 w-auto block" />
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-red-700">PDF</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-[color:var(--brand-ink)] truncate leading-[1.15]">{file.name}</p>
            <p className="text-xs text-[color:var(--brand-muted)] leading-none">{statusText}</p>
          </div>
        </div>

        <div className={actionsClassName}>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            name="editorFile"
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={onFileChange}
            disabled={busy}
            aria-hidden="true"
            tabIndex={-1}
          />
          <label
            htmlFor={fileInputId}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-disabled={busy}
            onKeyDown={(e) => {
              if (busy) return;
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              fileInputRef.current?.click();
            }}
            className={`${secondaryActionClassName} ${
              busy ? "opacity-50 pointer-events-none cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {t("uploadNew", "Upload New")}
          </label>
          <button
            type="button"
            className={primaryActionClassName}
            onClick={requestDownload}
            disabled={!iframeReady || !pdfLoaded || busy}
          >
            {busy ? t("working", "Working…") : t("saveDownload", "Save & Download")}
          </button>
          {showChangeFile && (
            <button
              type="button"
              className={`${secondaryActionClassName} disabled:opacity-50`}
              onClick={onBack}
              disabled={busy}
            >
              {t("changeFile", "Change file")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="m-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </div>
      )}

      {toolSwitcher ? (
        <div className="px-5 py-2 border-b border-[color:var(--brand-line)] bg-white">
          {toolSwitcher}
        </div>
      ) : null}

      <div className={viewerClassName}>
        <iframe
          ref={iframeRef}
          title={t("pdfEditorTitle", "PDF Editor")}
          className="w-full h-full"
          src={iframeSrc}
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
