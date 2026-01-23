"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { downloadBlob } from "@/lib/pdf/client";
import { savePdfEditorInput, savePdfEditorOutput } from "@/lib/pdfEditorCache";
import { saveUpload } from "@/lib/uploadStore";

type PdfDownloadMessage = { type: "pdf-download"; blob: Blob };
type PdfLoadedMessage = { type: "pdf-loaded"; pageCount?: number; loadToken?: number };
type PdfProgressMessage = { type: "pdf-progress"; loaded: number; total?: number; loadToken?: number };
type PdfPasswordErrorMessage = { type: "pdf-password-error"; loadToken?: number };
type PdfErrorMessage = { type: "pdf-error"; message?: string; loadToken?: number };
type PdfLoadCancelledMessage = { type: "pdf-load-cancelled"; loadToken?: number };

const TRANSFER_PDF_BYTES_LIMIT = 32 * 1024 * 1024; // 32MB

const UPLOAD_TIPS = [
  "Uploading and preparing your document. Optimizing for editing...",
  "Preparing the editor. This usually takes only a moment.",
  "Tip: Larger PDFs may take a bit longer to load—thanks for your patience.",
];

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
  if (!open) return null;
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Upload progress"
    >
      <div className="w-[min(840px,calc(100vw-2rem))] rounded-2xl bg-white shadow-2xl border border-gray-100 p-8">
        <h2 className="text-3xl font-semibold text-gray-900">Loading, please wait...</h2>
        <div className="mt-5 h-2 w-full rounded-full bg-blue-100 overflow-hidden" role="progressbar" aria-valuenow={clamped}>
          <div
            className="h-full bg-[#2d85de] transition-[width] duration-200"
            style={{ width: `${clamped}%` }}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-[#f8fafb] p-6 flex items-start gap-5">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                stroke="#2d85de"
                strokeWidth="1.6"
              />
              <path d="M14 3v4h4" stroke="#2d85de" strokeWidth="1.6" />
              <path
                d="M9 14l2 2 4-5"
                stroke="#15bb6f"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900">
              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-blue-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 18h6m-4 3h2m-6-10a5 5 0 1 1 10 0c0 2-1 3-2 4s-1 2-1 3h-4c0-1 0-2-1-3s-2-2-2-4Z"
                    stroke="#2d85de"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Productivity tip
            </div>
            <p className="mt-4 text-gray-600 text-base leading-relaxed">{tip}</p>
          </div>
        </div>

        {onCancel ? (
          <div className="mt-7 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={onCancel}
            >
              Cancel
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
  onConvert,
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
  onConvert?: () => void;
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
  const router = useRouter();
  const [iframeReady, setIframeReady] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadCancelled, setLoadCancelled] = useState(false);
  const appliedToolRef = useRef<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTip, setUploadTip] = useState(UPLOAD_TIPS[0]!);
  const uploadProgressTimerRef = useRef<number | null>(null);
  const uploadProgressStartTimeoutRef = useRef<number | null>(null);
  const hasRealProgressRef = useRef(false);

  const outName = useMemo(() => file.name.replace(/\.[^.]+$/, "") + "-edited.pdf", [file.name]);

  const postToEditor = useCallback((message: unknown, transfer?: Transferable[]) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    if (transfer && transfer.length > 0) {
      win.postMessage(message, "*", transfer);
    } else {
      win.postMessage(message, "*");
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
    const useTransfer = file.size <= TRANSFER_PDF_BYTES_LIMIT;
    const token = activeLoadTokenRef.current + 1;
    activeLoadTokenRef.current = token;
    let cancelled = false;
    setError("");
    setPdfLoaded(false);
    setLoadCancelled(false);
    setBusy(true);
    appliedToolRef.current = null;
    hasRealProgressRef.current = false;
    void (async () => {
      if (useTransfer) {
        const promise = fileBytesPromiseRef.current ?? file.arrayBuffer();
        const buffer = await promise.catch(() => null);
        if (cancelled || activeLoadTokenRef.current !== token) return;
        if (!buffer) {
          postToEditor({ type: "load-pdf", blob: file, loadToken: token });
          return;
        }
        postToEditor({ type: "load-pdf", data: buffer, loadToken: token }, [buffer]);
        return;
      }

      const url = fileObjectUrlRef.current;
      if (url) {
        if (cancelled || activeLoadTokenRef.current !== token) return;
        postToEditor({ type: "load-pdf", url, loadToken: token });
        return;
      }
      if (cancelled || activeLoadTokenRef.current !== token) return;
      postToEditor({ type: "load-pdf", blob: file, loadToken: token });
    })();

    return () => {
      cancelled = true;
    };
  }, [file, iframeReady, postToEditor]);

  const uploadOverlayOpen = !error && !pdfLoaded && (busy || !iframeReady);

  const cancelLoading = useCallback(() => {
    const tokenToCancel = activeLoadTokenRef.current;
    activeLoadTokenRef.current = tokenToCancel + 1;
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

    setUploadTip(UPLOAD_TIPS[Math.floor(Math.random() * UPLOAD_TIPS.length)] ?? UPLOAD_TIPS[0]!);
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
  }, [uploadOverlayOpen]);

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
      if (hasMessageType<PdfLoadedMessage["type"]>(evt.data, "pdf-loaded")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        hasRealProgressRef.current = false;
        setPdfLoaded(true);
        setBusy(false);
        setLoadCancelled(false);
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
        setError("This PDF is password protected. Please unlock it first, then re-open in the editor.");
      }
      if (hasMessageType<PdfErrorMessage["type"]>(evt.data, "pdf-error")) {
        if (!matchesLoadToken(evt.data, activeLoadTokenRef.current)) return;
        hasRealProgressRef.current = false;
        const rawMessage = (evt.data as PdfErrorMessage).message;
        const message =
          typeof rawMessage === "string" && rawMessage.trim().length > 0
            ? rawMessage.trim()
          : "Something went wrong while exporting your PDF. Please try again.";
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
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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

  const goToConvert = useCallback(async () => {
    if (onConvert) {
      onConvert();
      return;
    }
    setError("");
    setBusy(true);
    try {
      const uploadId = await saveUpload([file]);
      router.push(`/tools/convert?uploadId=${encodeURIComponent(uploadId)}`);
    } catch {
      setBusy(false);
      setError("Could not open the Convert tool. Please try again.");
    }
  }, [file, onConvert, router]);

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
      : "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden";

  const headerClassName =
    actionsPosition === "top-right"
      ? "relative flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-white/80 backdrop-blur"
      : "flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-white/80 backdrop-blur";

  const titleClassName =
    actionsPosition === "top-right"
      ? "min-w-0 flex items-center gap-3 pr-80"
      : "min-w-0 flex items-center gap-3";

  const actionsClassName =
    actionsPosition === "top-right"
      ? "absolute top-3 right-5 flex items-center gap-2"
      : "flex items-center gap-2";

  const statusText = busy
    ? "Working…"
    : pdfLoaded
      ? "Ready"
      : loadCancelled
        ? "Canceled"
        : iframeReady
          ? "Waiting…"
          : "Loading…";

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
            <Link href="/en" className="flex items-center">
              <img src="/logo.png" alt="QwerPDF" className="h-20 md:h-24 w-auto" />
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-red-700">PDF</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{statusText}</p>
          </div>
        </div>

        <div className={actionsClassName}>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
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
            className={`px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 ${
              busy ? "opacity-50 pointer-events-none cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            Upload New
          </label>
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => void goToConvert()}
            disabled={busy}
          >
            Convert
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
            onClick={requestDownload}
            disabled={!iframeReady || !pdfLoaded || busy}
          >
            {busy ? "Working..." : "Save & Download"}
          </button>
          {showChangeFile && (
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={onBack}
              disabled={busy}
            >
              Change file
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
        <div className="px-5 py-2 border-b border-gray-100 bg-white">
          {toolSwitcher}
        </div>
      ) : null}

      <div className={variant === "shell" ? "flex-1 min-h-0 bg-white" : "h-[75vh] min-h-[560px] bg-white"}>
        <iframe
          ref={iframeRef}
          title="PDF Editor"
          className="w-full h-full"
          src="/pdfeditor/index.html"
          onLoad={() => setIframeReady(true)}
        />
      </div>
    </div>
  );
}
