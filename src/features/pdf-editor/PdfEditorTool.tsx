"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob } from "@/lib/pdf/client";
import { savePdfEditorInput, savePdfEditorOutput } from "@/lib/pdfEditorCache";

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
}: {
  file: File;
  onBack: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    postToEditor({ type: "load-pdf", blob: file });
    return;
  }, [file, iframeReady, postToEditor]);

  useEffect(() => {
    const onMessage = (evt: MessageEvent) => {
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

  const requestDownload = useCallback(() => {
    if (!pdfLoaded) return;
    setError("");
    setBusy(true);
    postToEditor({ type: "download" });
    window.setTimeout(() => setBusy(false), 2_000);
  }, [pdfLoaded, postToEditor]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-white/70 backdrop-blur">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">PDF Editor</h3>
          <p className="text-sm text-gray-500 truncate">{file.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={onBack}
            disabled={busy}
          >
            Back
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
            onClick={requestDownload}
            disabled={!iframeReady || !pdfLoaded || busy}
          >
            {busy ? "Working..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="m-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="h-[75vh] min-h-[560px] bg-white">
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
