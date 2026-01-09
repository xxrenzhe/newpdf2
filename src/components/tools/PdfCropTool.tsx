"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { cropPdf, downloadBlob } from "@/lib/pdf/client";

export default function PdfCropTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [marginLeft, setMarginLeft] = useState(24);
  const [marginRight, setMarginRight] = useState(24);
  const [marginTop, setMarginTop] = useState(24);
  const [marginBottom, setMarginBottom] = useState(24);

  const isPdf = useMemo(
    () => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")),
    [file]
  );

  const run = useCallback(async () => {
    if (!file || !isPdf) return;
    setBusy(true);
    setError("");
    try {
      const bytes = await cropPdf(file, { marginLeft, marginRight, marginTop, marginBottom });
      const outName = file.name.replace(/\.[^.]+$/, "") + "-cropped.pdf";
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, marginBottom, marginLeft, marginRight, marginTop]);

  if (!file) {
    return <FileDropzone accept=".pdf,application/pdf" onFiles={(files) => setFile(files[0] ?? null)} title="Drop a PDF here to crop" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Crop Pages</h3>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <label className="text-sm text-gray-600">
          Left (pt)
          <input
            type="number"
            min={0}
            value={marginLeft}
            onChange={(e) => setMarginLeft(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Right (pt)
          <input
            type="number"
            min={0}
            value={marginRight}
            onChange={(e) => setMarginRight(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Top (pt)
          <input
            type="number"
            min={0}
            value={marginTop}
            onChange={(e) => setMarginTop(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Bottom (pt)
          <input
            type="number"
            min={0}
            value={marginBottom}
            onChange={(e) => setMarginBottom(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
      </div>

      {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={run}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
      >
        {busy ? "Working..." : "Crop & Download"}
      </button>
    </div>
  );
}

