"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { downloadBlob } from "@/lib/pdf/client";
import { savePdfEditorInput, savePdfEditorOutput } from "@/lib/pdfEditorCache";
import { saveUpload } from "@/lib/uploadStore";

type PdfDownloadMessage = { type: "pdf-download"; blob: Blob };
type PdfLoadedMessage = { type: "pdf-loaded"; pageCount?: number };
type PdfPasswordErrorMessage = { type: "pdf-password-error" };

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [iframeReady, setIframeReady] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const appliedToolRef = useRef<string | null>(null);

  const outName = useMemo(() => file.name.replace(/\.[^.]+$/, "") + "-edited.pdf", [file.name]);

  const postToEditor = useCallback((message: unknown) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(message, "*");
  }, []);

  useEffect(() => {
    void savePdfEditorInput(file).catch(() => {});
  }, [file]);

  useEffect(() => {
    if (!iframeReady) return;
    setError("");
    setPdfLoaded(false);
    setBusy(true);
    appliedToolRef.current = null;
    postToEditor({ type: "load-pdf", blob: file });
    return;
  }, [file, iframeReady, postToEditor]);

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
        setPdfLoaded(true);
        setBusy(false);
      }
      if (hasMessageType<PdfPasswordErrorMessage["type"]>(evt.data, "pdf-password-error")) {
        setBusy(false);
        setError("This PDF is password protected. Please unlock it first, then re-open in the editor.");
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

  const onUploadNew = useCallback(() => {
    if (busy) return;
    fileInputRef.current?.click();
  }, [busy]);

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

  return (
    <div className={shellClassName}>
      <div className={headerClassName}>
        <div className={titleClassName}>
          {showBrand ? (
            <Link href="/en" className="flex items-center">
              <img src="/assets/brand/logo.svg" alt="Files Editor" className="h-7" />
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-red-700">PDF</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{busy ? "Working…" : pdfLoaded ? "Ready" : "Loading…"}</p>
          </div>
        </div>

        <div className={actionsClassName}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            onClick={onUploadNew}
            disabled={busy}
          >
            Upload New
          </button>
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
            {busy ? "Working..." : "Done"}
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
