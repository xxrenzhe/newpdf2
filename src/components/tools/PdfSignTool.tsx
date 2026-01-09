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
    return <FileDropzone accept=".pdf,application/pdf" onFiles={(files) => setFile(files[0] ?? null)} title="Drop a PDF here to sign" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Sign PDF</h3>
          <p className="text-sm text-gray-500 truncate">{file.name}</p>
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          onClick={() => setFile(null)}
        >
          Change file
        </button>
      </div>

      {!isPdf && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          Please upload a PDF file.
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-900 mb-2">Draw your signature</p>
        <SignaturePad ref={padRef} />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">Tip: use a mouse or touch to sign.</p>
          <button
            type="button"
            className="text-sm text-gray-700 hover:text-gray-900"
            onClick={() => padRef.current?.clear()}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-sm text-gray-600">
          Page
          <input
            type="number"
            min={1}
            value={page}
            onChange={(e) => setPage(Number(e.target.value || 1))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Signature width (pt)
          <input
            type="number"
            min={50}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value || 180))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Right margin (pt)
          <input
            type="number"
            min={0}
            value={marginRight}
            onChange={(e) => setMarginRight(Number(e.target.value || 32))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Bottom margin (pt)
          <input
            type="number"
            min={0}
            value={marginBottom}
            onChange={(e) => setMarginBottom(Number(e.target.value || 32))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
      </div>

      {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={apply}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
      >
        {busy ? "Signing..." : "Apply Signature & Download"}
      </button>
    </div>
  );
}
