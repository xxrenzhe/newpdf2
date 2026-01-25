"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FileDropzone from "./FileDropzone";
import { addTextWatermark, downloadBlob } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function PdfWatermarkTool({ initialFile }: { initialFile?: File }) {
  const { t } = useLanguage();
  const defaultText = t("watermarkDefaultText", "CONFIDENTIAL");
  const defaultTextRef = useRef(defaultText);
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [text, setText] = useState(defaultText);
  const [opacity, setOpacity] = useState(0.18);
  const [fontSize, setFontSize] = useState(64);
  const [rotation, setRotation] = useState(-35);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setText((prev) => (prev === defaultTextRef.current ? defaultText : prev));
    defaultTextRef.current = defaultText;
  }, [defaultText]);

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
      setError(e instanceof Error ? e.message : t("watermarkFailed", "Failed to add watermark"));
    } finally {
      setBusy(false);
    }
  }, [file, fontSize, isPdf, opacity, rotation, t, text]);

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={(files) => setFile(files[0] ?? null)}
        title={t("dropPdfToWatermark", "Drop a PDF here to watermark")}
        subtitle={t("watermarkSubtitle", "Add text watermark to your PDF documents")}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[color:var(--brand-lilac)] to-[color:var(--brand-peach)] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
              {t("addWatermark", "Add Watermark")}
            </h3>
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

      {/* Watermark Preview */}
      <div className="mb-6 p-6 bg-gradient-to-br from-[color:var(--brand-cream)] to-[color:var(--brand-lilac)] rounded-xl border border-[color:var(--brand-line)] relative overflow-hidden">
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <span
            className="text-[color:var(--brand-muted)] font-bold whitespace-nowrap"
            style={{
              fontSize: `${Math.min(fontSize, 48)}px`,
              opacity: Math.max(opacity, 0.3),
            }}
          >
            {text || t("watermarkFallbackText", "WATERMARK")}
          </span>
        </div>
        <div className="relative z-10 text-center py-8">
          <p className="text-sm text-[color:var(--brand-muted)]">
            {t("watermarkPreview", "Watermark Preview")}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[color:var(--brand-ink)] mb-2">
          {t("watermarkText", "Watermark Text")}
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          name="watermarkText"
          autoComplete="off"
          placeholder={t("watermarkTextPlaceholder", "Enter watermark text…")}
          className="w-full h-12 px-4 rounded-xl border border-[color:var(--brand-line)] focus:border-primary focus:ring-2 focus:ring-[color:var(--brand-lilac)] transition-colors text-lg"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <label className="block">
          <span className="text-sm font-medium text-[color:var(--brand-ink)] flex items-center gap-2">
            <svg className="w-4 h-4 text-[color:var(--brand-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {t("opacityLabel", "Opacity")}
          </span>
          <input
            type="range"
            min={0.05}
            max={0.5}
            step={0.01}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            name="watermarkOpacity"
            className="mt-2 w-full h-2 bg-[color:var(--brand-line)] rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-[color:var(--brand-muted)] mt-1 block">{Math.round(opacity * 100)}%</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[color:var(--brand-ink)] flex items-center gap-2">
            <svg className="w-4 h-4 text-[color:var(--brand-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
            {t("fontSizeLabel", "Font Size")}
          </span>
          <input
            type="range"
            min={24}
            max={120}
            step={4}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            name="watermarkFontSize"
            className="mt-2 w-full h-2 bg-[color:var(--brand-line)] rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-[color:var(--brand-muted)] mt-1 block">{fontSize}pt</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[color:var(--brand-ink)] flex items-center gap-2">
            <svg className="w-4 h-4 text-[color:var(--brand-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {t("rotationLabel", "Rotation")}
          </span>
          <input
            type="range"
            min={-60}
            max={60}
            step={5}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            name="watermarkRotation"
            className="mt-2 w-full h-2 bg-[color:var(--brand-line)] rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-[color:var(--brand-muted)] mt-1 block">{rotation}°</span>
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
        onClick={run}
        className="w-full h-12 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            {t("applyingWatermark", "Applying watermark…")}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            {t("applyDownload", "Apply & Download")}
          </>
        )}
      </button>
    </div>
  );
}
