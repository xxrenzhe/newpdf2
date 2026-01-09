"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { downloadBlob, extractPdfPages, splitPdfToZip } from "@/lib/pdf/client";

function parsePageRanges(input: string, maxPages: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const nums = new Set<number>();
  for (const part of trimmed.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-", 2).map((s) => Number(s.trim()));
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let n = start; n <= end; n++) {
        if (n >= 1 && n <= maxPages) nums.add(n);
      }
    } else {
      const n = Number(part);
      if (Number.isFinite(n) && n >= 1 && n <= maxPages) nums.add(n);
    }
  }
  return Array.from(nums).sort((x, y) => x - y);
}

type Mode = "extract" | "splitZip";

export default function PdfSplitTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("extract");
  const [maxPages, setMaxPages] = useState<number>(0);
  const [range, setRange] = useState("1-1");

  const isPdf = useMemo(
    () => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")),
    [file]
  );

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0] ?? null;
    setFile(f);
    setError("");
    setMaxPages(0);
    if (!f) return;

    try {
      const { configurePdfJsWorker, pdfjs } = await import("@/lib/pdf/pdfjs");
      configurePdfJsWorker();
      const data = new Uint8Array(await f.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      setMaxPages(doc.numPages);
      setRange(doc.numPages > 1 ? "1-2" : "1-1");
    } catch {
      setMaxPages(0);
    }
  }, []);

  const run = useCallback(async () => {
    if (!file || !isPdf) return;
    setError("");
    setBusy(true);
    try {
      const pages = parsePageRanges(range, maxPages || Number.MAX_SAFE_INTEGER);

      if (mode === "extract") {
        if (pages.length === 0) throw new Error("Please enter pages to extract.");
        const bytes = await extractPdfPages(file, pages);
        const outName = file.name.replace(/\.[^.]+$/, "") + "-extracted.pdf";
        downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
        return;
      }

      const zip = await splitPdfToZip(file, pages.length > 0 ? pages : undefined);
      const outName = file.name.replace(/\.[^.]+$/, "") + "-split.zip";
      downloadBlob(zip, outName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, maxPages, mode, range]);

  if (!file) {
    return <FileDropzone accept=".pdf,application/pdf" onFiles={onFiles} title="Drop a PDF here to split/extract" />;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Split & Extract Pages</h3>
          <p className="text-sm text-gray-500 truncate">
            {file.name}
            {maxPages ? ` · ${maxPages} pages` : ""}
          </p>
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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">
          Mode
          <select
            className="ml-2 h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="extract">Extract to one PDF</option>
            <option value="splitZip">Split to ZIP (one PDF per page)</option>
          </select>
        </label>
        <label className="text-sm text-gray-600">
          Pages
          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="e.g. 1-3,5,7"
            className="ml-2 h-10 px-3 rounded-lg border border-gray-200 w-[220px]"
          />
        </label>
        <span className="text-xs text-gray-500">Examples: `1-3`, `1,3,5`, `2-4,8`</span>
      </div>

      {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={run}
        className="w-full h-12 rounded-xl bg-[#2d85de] hover:bg-[#2473c4] text-white font-medium disabled:opacity-50"
      >
        {busy ? "Working..." : mode === "extract" ? "Extract & Download" : "Split & Download ZIP"}
      </button>
    </div>
  );
}

