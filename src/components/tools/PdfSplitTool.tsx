"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { downloadBlob, extractPdfPages, splitPdfToZip } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";

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
  const { t } = useLanguage();

  const modeInfo: Record<Mode, { label: string; desc: string; icon: React.ReactNode }> = {
    extract: {
      label: t("splitExtractLabel", "Extract to PDF"),
      desc: t("splitExtractDesc", "Extract selected pages into one PDF"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-6M9 15l3 3 3-3" />
        </svg>
      ),
    },
    splitZip: {
      label: t("splitZipLabel", "Split to ZIP"),
      desc: t("splitZipDesc", "One PDF per page in ZIP file"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 8v13H3V8M1 3h22v5H1z" />
          <path d="M10 12h4" />
        </svg>
      ),
    },
  };

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
        if (pages.length === 0) throw new Error(t("splitPagesRequired", "Please enter pages to extract."));
        const bytes = await extractPdfPages(file, pages);
        const outName = file.name.replace(/\.[^.]+$/, "") + "-extracted.pdf";
        downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
        return;
      }

      const zip = await splitPdfToZip(file, pages.length > 0 ? pages : undefined);
      const outName = file.name.replace(/\.[^.]+$/, "") + "-split.zip";
      downloadBlob(zip, outName);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("splitFailed", "Split failed"));
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, maxPages, mode, range, t]);

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={onFiles}
        title={t("dropPdfToSplit", "Drop a PDF here to split/extract")}
        subtitle={t("splitSubtitle", "Split PDF into multiple files or extract specific pages")}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[color:var(--brand-peach)] to-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-[color:var(--brand-purple-dark)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M12 3v18" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
              {t("splitExtractPages", "Split & Extract Pages")}
            </h3>
            <p className="text-sm text-[color:var(--brand-muted)] truncate">
              {file.name}
              {maxPages ? (
                <span className="text-primary ml-2 font-medium">
                  {t("pageCount", "{count} pages").replace("{count}", `${maxPages}`)}
                </span>
              ) : ""}
            </p>
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
          {t("changeFile", "Change file")}
        </button>
      </div>

      {!isPdf && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          {t("uploadPdfOnly", "Please upload a PDF file.")}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-[color:var(--brand-ink)] mb-3">
          {t("splitModeLabel", "Split Mode")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(modeInfo) as Mode[]).map((key) => {
            const info = modeInfo[key];
            const isActive = mode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isActive
                    ? "border-primary bg-[color:var(--brand-lilac)]"
                    : "border-[color:var(--brand-line)] hover:border-[color:var(--brand-line)] hover:bg-[color:var(--brand-cream)]"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  isActive ? "bg-primary text-white" : "bg-[color:var(--brand-cream)] text-[color:var(--brand-muted)]"
                }`}>
                  {info.icon}
                </div>
                <div className={`font-medium ${isActive ? "text-primary" : "text-[color:var(--brand-ink)]"}`}>
                  {info.label}
                </div>
                <div className="text-xs text-[color:var(--brand-muted)] mt-1">{info.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
          {t("pageRangeLabel", "Page Range")}
        </label>
        <input
          value={range}
          onChange={(e) => setRange(e.target.value)}
          placeholder={t("pageRangePlaceholder", "e.g. 1-3, 5, 7")}
          className="w-full h-12 px-4 rounded-xl border border-[color:var(--brand-line)] focus:border-primary focus:ring-2 focus:ring-[color:var(--brand-lilac)] transition-all text-lg"
        />
        <p className="text-xs text-[color:var(--brand-muted)] mt-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          {t("pageRangeExamples", "Examples: 1-3, 1,3,5, 2-4,8")}
          {maxPages > 0
            ? ` | ${t("pageRangeTotal", "Total: {count} pages").replace("{count}", `${maxPages}`)}`
            : ""}
        </p>
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
        onClick={run}
        className="w-full h-12 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            {t("working", "Working...")}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mode === "extract" ? (
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              ) : (
                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
              )}
            </svg>
            {mode === "extract"
              ? t("extractDownload", "Extract & Download")
              : t("splitDownloadZip", "Split & Download ZIP")}
          </>
        )}
      </button>
    </div>
  );
}
