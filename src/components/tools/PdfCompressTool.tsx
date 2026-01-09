"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import type { PdfCompressPreset } from "@/lib/pdf/client";
import { compressPdfRasterize, downloadBlob } from "@/lib/pdf/client";

export default function PdfCompressTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [preset, setPreset] = useState<PdfCompressPreset>("balanced");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>("");

  const isPdf = useMemo(() => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")), [file]);

  const run = useCallback(async () => {
    if (!file || !isPdf) return;
    setBusy(true);
    setNote("");
    try {
      const bytes = await compressPdfRasterize(file, preset);
      const outName = file.name.replace(/\.[^.]+$/, "") + `-compressed-${preset}.pdf`;
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
      setNote("Compression uses rasterization (images). Text/vectors may no longer be selectable.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Compression failed");
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, preset]);

  if (!file) {
    return <FileDropzone accept=".pdf,application/pdf" onFiles={(files) => setFile(files[0] ?? null)} title="Drop a PDF here to compress" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Compress PDF</h3>
          <p className="text-sm text-gray-500 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
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

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Quality</label>
        <select
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
          value={preset}
          onChange={(e) => setPreset(e.target.value as PdfCompressPreset)}
        >
          <option value="balanced">Balanced</option>
          <option value="small">Smaller</option>
          <option value="smallest">Smallest</option>
        </select>
      </div>

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={run}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
      >
        {busy ? "Compressing..." : "Compress & Download"}
      </button>

      {note && <p className="text-xs text-gray-500 mt-3">{note}</p>}
    </div>
  );
}
