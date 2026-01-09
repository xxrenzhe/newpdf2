"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import type { PdfCompressPreset } from "@/lib/pdf/client";
import { compressPdfRasterize, downloadBlob } from "@/lib/pdf/client";

const presetInfo: Record<PdfCompressPreset, { label: string; desc: string; icon: React.ReactNode }> = {
  balanced: {
    label: "Balanced",
    desc: "Good quality, moderate size reduction",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v18M3 12h18" />
      </svg>
    ),
  },
  small: {
    label: "Smaller",
    desc: "Lower quality, better compression",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  smallest: {
    label: "Smallest",
    desc: "Minimum quality, maximum compression",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        <path d="M5 3h14" />
      </svg>
    ),
  },
};

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
    return <FileDropzone accept=".pdf,application/pdf" onFiles={(files) => setFile(files[0] ?? null)} title="Drop a PDF here to compress" subtitle="Reduce PDF file size while maintaining quality" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Compress PDF</h3>
            <p className="text-sm text-gray-500 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2 transition-colors"
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
        <label className="block text-sm font-medium text-gray-700 mb-3">Compression Level</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(presetInfo) as PdfCompressPreset[]).map((key) => {
            const info = presetInfo[key];
            const isActive = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isActive
                    ? "border-[#2d85de] bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  isActive ? "bg-[#2d85de] text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {info.icon}
                </div>
                <div className={`font-medium ${isActive ? "text-[#2d85de]" : "text-gray-900"}`}>
                  {info.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">{info.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={run}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            Compressing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Compress & Download
          </>
        )}
      </button>

      {note && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            {note}
          </p>
        </div>
      )}
    </div>
  );
}
