"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { addTextWatermark, downloadBlob } from "@/lib/pdf/client";

export default function PdfWatermarkTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.18);
  const [fontSize, setFontSize] = useState(64);
  const [rotation, setRotation] = useState(-35);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isPdf = useMemo(
    () => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")),
    [file]
  );

  const run = useCallback(async () => {
    if (!file || !isPdf) return;
    setError("");
    setBusy(true);
    try {
      const bytes = await addTextWatermark(file, {
        text,
        opacity,
        fontSize,
        rotationDegrees: rotation,
      });
      const outName = file.name.replace(/\.[^.]+$/, "") + "-watermarked.pdf";
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add watermark");
    } finally {
      setBusy(false);
    }
  }, [file, fontSize, isPdf, opacity, rotation, text]);

  if (!file) {
    return <FileDropzone accept=".pdf,application/pdf" onFiles={(files) => setFile(files[0] ?? null)} title="Drop a PDF here to watermark" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Add Watermark</h3>
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

      <label className="block text-sm text-gray-600 mb-3">
        Watermark text
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
        />
      </label>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <label className="text-sm text-gray-600">
          Opacity
          <input
            type="number"
            min={0}
            max={1}
            step={0.02}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Font size
          <input
            type="number"
            min={12}
            max={160}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value || 64))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
          />
        </label>
        <label className="text-sm text-gray-600">
          Rotation (deg)
          <input
            type="number"
            min={-90}
            max={90}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value || 0))}
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
        {busy ? "Working..." : "Apply & Download"}
      </button>
    </div>
  );
}

