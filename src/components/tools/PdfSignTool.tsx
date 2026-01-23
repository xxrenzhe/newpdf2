"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import FileDropzone from "./FileDropzone";
import SignaturePad, { type SignaturePadHandle } from "./SignaturePad";
import { dataUrlToUint8Array, downloadBlob, signPdfWithPng } from "@/lib/pdf/client";

export default function PdfSignTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(180);
  const [marginRight, setMarginRight] = useState(32);
  const [marginBottom, setMarginBottom] = useState(32);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const padRef = useRef<SignaturePadHandle>(null);

  const isPdf = useMemo(() => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")), [file]);

  const apply = useCallback(async () => {
    if (!file || !isPdf) return;
    setError("");
    const dataUrl = padRef.current?.toPngDataUrl() ?? "";
    if (!dataUrl || padRef.current?.isEmpty()) {
      setError("Please draw a signature first.");
      return;
    }

    setBusy(true);
    try {
      const bytes = await signPdfWithPng(file, dataUrlToUint8Array(dataUrl), {
        pageNumber1Based: page,
        width,
        marginRight,
        marginBottom,
      });
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), file.name.replace(/\.[^.]+$/, "") + "-signed.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signing failed");
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, marginBottom, marginRight, page, width]);

  if (!file) {
    return <FileDropzone accept=".pdf,application/pdf" onFiles={(files) => setFile(files[0] ?? null)} title="Drop a PDF here to sign" subtitle="Add your signature to any PDF document" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[color:var(--brand-peach)] to-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-[color:var(--brand-purple-dark)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">Sign PDF</h3>
            <p className="text-sm text-[color:var(--brand-muted)] truncate">{file.name}</p>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] text-sm flex items-center gap-2 transition-colors"
          onClick={() => setFile(null)}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Change file
        </button>
      </div>

      {!isPdf && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          Please upload a PDF file.
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-[color:var(--brand-ink)]">Draw your signature</p>
          <button
            type="button"
            className="text-sm text-primary hover:text-[color:var(--brand-purple-dark)] font-medium flex items-center gap-1 transition-colors"
            onClick={() => padRef.current?.clear()}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Clear
          </button>
        </div>
        <div className="border-2 border-dashed border-[color:var(--brand-line)] rounded-xl overflow-hidden bg-[color:var(--brand-cream)]">
          <SignaturePad ref={padRef} />
        </div>
        <p className="text-xs text-[color:var(--brand-muted)] mt-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Tip: use a mouse or touch to sign
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <label className="block">
          <span className="text-sm text-[color:var(--brand-muted)] font-medium">Page</span>
          <input
            type="number"
            min={1}
            value={page}
            onChange={(e) => setPage(Number(e.target.value || 1))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)] focus:border-primary focus:ring-2 focus:ring-[color:var(--brand-lilac)] transition-all"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[color:var(--brand-muted)] font-medium">Width (pt)</span>
          <input
            type="number"
            min={50}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value || 180))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)] focus:border-primary focus:ring-2 focus:ring-[color:var(--brand-lilac)] transition-all"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[color:var(--brand-muted)] font-medium">Right margin</span>
          <input
            type="number"
            min={0}
            value={marginRight}
            onChange={(e) => setMarginRight(Number(e.target.value || 32))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)] focus:border-primary focus:ring-2 focus:ring-[color:var(--brand-lilac)] transition-all"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[color:var(--brand-muted)] font-medium">Bottom margin</span>
          <input
            type="number"
            min={0}
            value={marginBottom}
            onChange={(e) => setMarginBottom(Number(e.target.value || 32))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)] focus:border-primary focus:ring-2 focus:ring-[color:var(--brand-lilac)] transition-all"
          />
        </label>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={apply}
        className="w-full h-12 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            Signing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            Apply Signature & Download
          </>
        )}
      </button>
    </div>
  );
}
