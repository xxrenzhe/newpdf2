"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import type { PdfCompressPreset } from "@/lib/pdf/client";
import { compressPdfRasterize, downloadBlob } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function PdfCompressTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [preset, setPreset] = useState<PdfCompressPreset>("balanced");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>("");
  const { t } = useLanguage();

  const presetInfo: Record<PdfCompressPreset, { label: string; desc: string; icon: React.ReactNode }> = {
    balanced: {
      label: t("presetBalanced", "Balanced"),
      desc: t("presetBalancedDesc", "Good quality, moderate size reduction"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M3 12h18" />
        </svg>
      ),
    },
    small: {
      label: t("presetSmaller", "Smaller"),
      desc: t("presetSmallerDesc", "Lower quality, better compression"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
    },
    smallest: {
      label: t("presetSmallest", "Smallest"),
      desc: t("presetSmallestDesc", "Minimum quality, maximum compression"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          <path d="M5 3h14" />
        </svg>
      ),
    },
  };

  const isPdf = useMemo(() => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")), [file]);

  const run = useCallback(async () => {
    if (!file || !isPdf) return;
    setBusy(true);
    setNote("");
    try {
      const bytes = await compressPdfRasterize(file, preset);
      const outName = file.name.replace(/\.[^.]+$/, "") + `-compressed-${preset}.pdf`;
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
      setNote(
        t(
          "compressionRasterNote",
          "Compression uses rasterization (images). Text/vectors may no longer be selectable."
        )
      );
    } catch (e) {
      setNote(e instanceof Error ? e.message : t("compressionFailed", "Compression failed"));
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, preset, t]);

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={(files) => setFile(files[0] ?? null)}
        title={t("dropPdfToCompress", "Drop a PDF here to compress")}
        subtitle={t("compressSubtitle", "Reduce PDF file size while maintaining quality")}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 bg-gradient-to-br from-[color:var(--brand-peach)] to-[color:var(--brand-lilac)] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-[color:var(--brand-purple-dark)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
              {t("compressPdf", "Compress PDF")}
            </h3>
            <p className="text-sm text-[color:var(--brand-muted)] truncate">{file.name}</p>
            <p className="text-xs text-[color:var(--brand-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <button
          type="button"
          className="w-full sm:w-auto sm:shrink-0 px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] text-sm flex items-center justify-center gap-2 transition-colors"
          onClick={() => setFile(null)}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="min-w-0 truncate">{t("changeFile", "Change file")}</span>
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
          {t("compressionLevel", "Compression Level")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(presetInfo) as PdfCompressPreset[]).map((key) => {
            const info = presetInfo[key];
            const isActive = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={`p-4 rounded-xl border-2 text-left transition-colors duration-200 ${
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

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={run}
        className="w-full h-12 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            {t("compressing", "Compressing…")}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {t("compressDownload", "Compress & Download")}
          </>
        )}
      </button>

      {note && (
        <div className="mt-4 p-3 bg-[color:var(--brand-lilac)] border border-[color:var(--brand-line)] rounded-lg">
          <p className="text-xs text-[color:var(--brand-ink)] flex items-start gap-2">
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
