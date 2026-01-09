"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { downloadBlob, extractPdfText, imagesToPdf, pdfToImagesZip } from "@/lib/pdf/client";

type Mode = "auto" | "pdf-to-images" | "pdf-to-text" | "images-to-pdf" | "file-to-pdf";

export default function PdfConvertTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  const [mode, setMode] = useState<Mode>("auto");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.85);

  const inferred = useMemo<Mode>(() => {
    if (mode !== "auto") return mode;
    const first = files[0];
    if (!first) return "auto";
    const isPdf = first.type === "application/pdf" || first.name.toLowerCase().endsWith(".pdf");
    if (isPdf) return "pdf-to-images";
    const isImage = first.type.startsWith("image/") || /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(first.name);
    if (isImage) return "images-to-pdf";
    return "file-to-pdf";
  }, [files, mode]);

  const run = useCallback(async () => {
    if (files.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      if (inferred === "file-to-pdf") {
        if (files.length !== 1) throw new Error("Please upload a single file for conversion.");
        const f = files[0]!;
        const form = new FormData();
        form.set("file", f, f.name);
        const res = await fetch("/api/convert/to-pdf", { method: "POST", body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Self-hosted conversion service is not available");
        }
        const blob = await res.blob();
        downloadBlob(blob, f.name.replace(/\.[^.]+$/, "") + ".pdf");
        return;
      }

      if (inferred === "images-to-pdf") {
        const bytes = await imagesToPdf(files);
        downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), "images.pdf");
        return;
      }

      const pdfFile = files[0];
      if (!pdfFile) return;
      const isPdf = pdfFile.type === "application/pdf" || pdfFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) throw new Error("Please upload a PDF file.");

      if (inferred === "pdf-to-text") {
        const text = await extractPdfText(pdfFile);
        downloadBlob(new Blob([text], { type: "text/plain" }), pdfFile.name.replace(/\.[^.]+$/, "") + ".txt");
        return;
      }

      const zip = await pdfToImagesZip(pdfFile, { format, dpi, quality });
      downloadBlob(zip, pdfFile.name.replace(/\.[^.]+$/, "") + `-${dpi}dpi-images.zip`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  }, [dpi, files, format, inferred, quality]);

  if (files.length === 0) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
        multiple
        onFiles={setFiles}
        title="Drop files here to convert"
        subtitle="PDF → images/text, images → PDF, or Office → PDF (self-hosted)"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Convert</h3>
          <p className="text-sm text-gray-500 truncate">
            {files.length} file(s): {files.map((f) => f.name).join(", ")}
          </p>
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          onClick={() => setFiles([])}
        >
          Reset
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Mode</label>
        <select
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option value="auto">Auto</option>
          <option value="pdf-to-images">PDF → Images (.zip)</option>
          <option value="pdf-to-text">PDF → Text (.txt)</option>
          <option value="images-to-pdf">Images → PDF</option>
          <option value="file-to-pdf">Office → PDF (self-hosted)</option>
        </select>
      </div>

      {inferred === "pdf-to-images" && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <label className="text-sm text-gray-600">
            Format
            <select
              className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value as "png" | "jpg")}
            >
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">
            DPI
            <input
              type="number"
              min={72}
              max={300}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value || 150))}
            />
          </label>
          <label className="text-sm text-gray-600">
            Quality
            <input
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value || 0.85))}
            />
          </label>
        </div>
      )}

      {message && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {message}
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
      >
        {busy ? "Working..." : "Convert & Download"}
      </button>
    </div>
  );
}
