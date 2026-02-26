"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import FileDropzone from "./FileDropzone";
import { mergePdfs, downloadBlob } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";
import { notifyPdfToolError } from "@/lib/pdf/toolFeedback";

export default function PdfMergeTool({ initialFiles }: { initialFiles?: File[] }) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { t } = useLanguage();
  const canMerge = files.length >= 2 && files.every((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));

  const totalSize = useMemo(() => files.reduce((acc, f) => acc + f.size, 0), [files]);

  const merge = useCallback(async () => {
    if (!canMerge) return;
    setBusy(true);
    setProgress({ current: 0, total: files.length });
    try {
      const bytes = await mergePdfs(files, {
        onProgress: (current, total) => setProgress({ current, total }),
      });
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), "merged.pdf");
    } catch (e) {
      notifyPdfToolError(e, t("mergeFailed", "Merge failed. Please check your files and try again."));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [canMerge, files, t]);

  const addMoreFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    setFiles(prev => [...prev, ...fileArray]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    setFiles(prev => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(from, 1);
      newFiles.splice(to, 0, removed!);
      return newFiles;
    });
  }, [files.length]);

  if (files.length === 0) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        multiple
        onFiles={setFiles}
        title={t("dropPdfsToMerge", "Drop PDFs here to merge")}
        subtitle={t("mergeSelectMultiple", "Select 2 or more PDF files")}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
            {t("mergeDocuments", "Merge Documents")}
          </h3>
          <p className="text-sm text-[color:var(--brand-muted)]">
            {t("mergeFileCountSize", "{count} file(s) - {size} MB total")
              .replace("{count}", `${files.length}`)
              .replace("{size}", (totalSize / 1024 / 1024).toFixed(2))}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:shrink-0">
          <label
            htmlFor={inputId}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              inputRef.current?.click();
            }}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="min-w-0 truncate">{t("addMore", "Add more")}</span>
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            name="mergeFiles"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => {
              if (!e.target.files) return;
              addMoreFiles(e.target.files);
              e.target.value = "";
            }}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => setFiles([])}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] text-sm flex items-center justify-center"
          >
            <span className="min-w-0 truncate">{t("reset", "Reset")}</span>
          </button>
        </div>
      </div>

      {!canMerge && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {t("mergeMinFiles", "Please upload at least 2 PDF files.")}
        </div>
      )}

      <div className="space-y-2 mb-6">
        {files.map((f, index) => (
          <div
            key={`${f.name}-${f.lastModified}`}
            className="flex items-center gap-3 p-3 bg-[color:var(--brand-cream)] rounded-xl group hover:bg-[color:var(--brand-cream)] transition-colors"
          >
            <div className="w-10 h-10 bg-[color:var(--brand-lilac)] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-[color:var(--brand-purple)] text-[10px] font-bold">PDF</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[color:var(--brand-ink)] text-sm truncate">{f.name}</p>
              <p className="text-xs text-[color:var(--brand-muted)]">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => moveFile(index, index - 1)}
                disabled={index === 0}
                aria-label={t("moveUp", "Move up")}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("moveUp", "Move up")}
              >
                <svg className="w-4 h-4 text-[color:var(--brand-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveFile(index, index + 1)}
                disabled={index === files.length - 1}
                aria-label={t("moveDown", "Move down")}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("moveDown", "Move down")}
              >
                <svg className="w-4 h-4 text-[color:var(--brand-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={t("remove", "Remove")}
                className="p-1.5 rounded-lg hover:bg-red-50"
                title={t("remove", "Remove")}
              >
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-[color:var(--brand-muted)] w-6 text-center">{index + 1}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!canMerge || busy}
        onClick={merge}
        className="w-full h-12 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="w-5 h-5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364l-2.828 2.828m-5.072 5.072l-2.828 2.828m12.728 0l-2.828-2.828M6.464 6.464L3.636 3.636" />
            </svg>
            {t("merging", "Merging…")}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            {t("mergeDownload", "Merge & Download")}
          </>
        )}
      </button>
      {busy && progress && progress.total > 0 && (
        <p className="mt-3 text-xs text-[color:var(--brand-muted)] text-center">
          {t("processingProgress", "Processing {current} / {total}")
            .replace("{current}", `${Math.min(progress.current, progress.total)}`)
            .replace("{total}", `${progress.total}`)}
        </p>
      )}
    </div>
  );
}
