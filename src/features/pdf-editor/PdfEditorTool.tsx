"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "@/components/AppLink";
import { useLanguage } from "@/components/LanguageProvider";
import EmbeddedPdfEditor from "@/features/pdf-editor/EmbeddedPdfEditor";
import { usePdfEditorMessages } from "@/features/pdf-editor/usePdfEditorMessages";
import { usePdfEditorLoadLifecycle } from "@/features/pdf-editor/usePdfEditorLoadLifecycle";
import { usePdfEditorBridge } from "@/features/pdf-editor/usePdfEditorBridge";
import { usePdfEditorDom } from "@/features/pdf-editor/usePdfEditorDom";
import { usePdfEditorFileIO } from "@/features/pdf-editor/usePdfEditorFileIO";
import { usePdfEditorUiState } from "@/features/pdf-editor/usePdfEditorUiState";
import { usePdfEditorErrorHandler } from "@/features/pdf-editor/usePdfEditorErrorHandler";

const TRANSFER_PDF_BYTES_LIMIT = 32 * 1024 * 1024; // 32MB
const EDITOR_READY_TIMEOUT_MS = 12000;
const PDF_LOAD_TIMEOUT_MS = 60000;
const IFRAME_LOAD_TIMEOUT_MS = 15000;
const PDFEDITOR_BUILD_ID = (process.env.NEXT_PUBLIC_PDFEDITOR_BUILD_ID ?? "").trim();
const BLOCKED_NAVIGATION_MESSAGE = "Editor navigation was blocked and reloaded.";
const ENABLE_EDITOR_LEGACY_FALLBACK = process.env.NEXT_PUBLIC_EDITOR_LEGACY_FALLBACK === "true";

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
  const editorFrameRef = useRef<HTMLIFrameElement>(null);
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
  const [externalEmbedWarning, setExternalEmbedWarning] = useState("");
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
  const manualCancelTokenRef = useRef<number | null>(null);
  const blockedEmbedCountRef = useRef(0);
  const { fileObjectUrlRef, fileBytesPromiseRef } = usePdfEditorFileIO({
    file,
    pdfLoaded,
    transferPdfBytesLimit: TRANSFER_PDF_BYTES_LIMIT,
  });
  const editorKey = useMemo(() => {
    const params = new URLSearchParams();
    if (lang) params.set("lang", lang);
    if (PDFEDITOR_BUILD_ID) params.set("v", PDFEDITOR_BUILD_ID.slice(0, 12));
    return params.toString();
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
    setExternalEmbedWarning("");
    blockedEmbedCountRef.current = 0;
    pendingLoadTokenRef.current = null;
    pendingLoadFileRef.current = null;
    manualCancelTokenRef.current = null;
    if (ENABLE_EDITOR_LEGACY_FALLBACK) {
      editorFallbackUsedRef.current = false;
      if (editorFallbackTimerRef.current) {
        window.clearTimeout(editorFallbackTimerRef.current);
        editorFallbackTimerRef.current = null;
      }
    }
    if (editorPingTimerRef.current) {
      window.clearInterval(editorPingTimerRef.current);
      editorPingTimerRef.current = null;
    }
  }, [editorKey]);

  useEffect(() => {
    setExternalEmbedWarning("");
    blockedEmbedCountRef.current = 0;
  }, [file]);

  const { postToEditor } = usePdfEditorBridge({
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
    enableLegacyFallback: ENABLE_EDITOR_LEGACY_FALLBACK,
    transferPdfBytesLimit: TRANSFER_PDF_BYTES_LIMIT,
  });

  const { detectEditorBooted, injectMobileOverrides } = usePdfEditorDom({
    editorFrameRef,
  });


  const { uploadOverlayOpen, abortActiveLoad, cancelLoading } = usePdfEditorLoadLifecycle({
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
    iframeLoadTimeoutMs: IFRAME_LOAD_TIMEOUT_MS,
    editorReadyTimeoutMs: EDITOR_READY_TIMEOUT_MS,
    pdfLoadTimeoutMs: PDF_LOAD_TIMEOUT_MS,
  });

  usePdfEditorMessages({
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
  });


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

  const {
    shellClassName,
    viewerClassName,
    headerClassName,
    titleClassName,
    actionsClassName,
    secondaryActionClassName,
    primaryActionClassName,
    statusText,
  } = usePdfEditorUiState({
    variant,
    actionsPosition,
    busy,
    pdfLoaded,
    loadCancelled,
    iframeReady,
    t,
  });

  const handleEditorError = usePdfEditorErrorHandler({
    t,
    blockedNavigationMessage: BLOCKED_NAVIGATION_MESSAGE,
    iframeReady,
    editorBooted,
    pdfLoaded,
    abortActiveLoad,
    setBusy,
    setError,
    setExternalEmbedWarning,
  });

  const handleEditorReady = useCallback(() => {
    injectMobileOverrides();
    setIframeReady(true);
    setEditorReady(false);
    setError("");
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
            data-testid="pdf-editor-upload-input"
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
            data-testid="pdf-editor-upload-new"
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
            data-testid="pdf-editor-save-download"
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

      {externalEmbedWarning && !error && (
        <div className="mx-5 mb-5 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
          {externalEmbedWarning}
        </div>
      )}

      {toolSwitcher ? (
        <div className="px-5 py-2 border-b border-[color:var(--brand-line)] bg-white">
          {toolSwitcher}
        </div>
      ) : null}

      <div className={viewerClassName}>
        <EmbeddedPdfEditor
          key={editorKey}
          iframeRef={editorFrameRef}
          lang={lang}
          buildId={PDFEDITOR_BUILD_ID ? PDFEDITOR_BUILD_ID.slice(0, 12) : undefined}
          onReady={handleEditorReady}
          onError={handleEditorError}
        />
      </div>
    </div>
  );
}
