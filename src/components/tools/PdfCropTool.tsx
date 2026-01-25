"use client";

import { useCallback, useMemo, useState } from "react";
import FileDropzone from "./FileDropzone";
import { cropPdf, downloadBlob } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";

export default function PdfCropTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [marginLeft, setMarginLeft] = useState(24);
  const [marginRight, setMarginRight] = useState(24);
  const [marginTop, setMarginTop] = useState(24);
  const [marginBottom, setMarginBottom] = useState(24);
  const { t } = useLanguage();

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
      setError(e instanceof Error ? e.message : t("cropFailed", "Crop failed"));
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, marginBottom, marginLeft, marginRight, marginTop, t]);

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={(files) => setFile(files[0] ?? null)}
        title={t("dropPdfToCrop", "Drop a PDF here to crop")}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
            {t("cropPages", "Crop Pages")}
          </h3>
          <p className="text-sm text-[color:var(--brand-muted)] truncate">{file.name}</p>
        </div>
        <button
          type="button"
          className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
          onClick={() => setFile(null)}
        >
          {t("changeFile", "Change file")}
        </button>
      </div>

      {!isPdf && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {t("uploadPdfOnly", "Please upload a PDF file.")}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <label className="text-sm text-[color:var(--brand-muted)]">
          {t("leftPt", "Left (pt)")}
          <input
            type="number"
            min={0}
            name="cropLeft"
            autoComplete="off"
            value={marginLeft}
            onChange={(e) => setMarginLeft(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)]"
          />
        </label>
        <label className="text-sm text-[color:var(--brand-muted)]">
          {t("rightPt", "Right (pt)")}
          <input
            type="number"
            min={0}
            name="cropRight"
            autoComplete="off"
            value={marginRight}
            onChange={(e) => setMarginRight(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)]"
          />
        </label>
        <label className="text-sm text-[color:var(--brand-muted)]">
          {t("topPt", "Top (pt)")}
          <input
            type="number"
            min={0}
            name="cropTop"
            autoComplete="off"
            value={marginTop}
            onChange={(e) => setMarginTop(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)]"
          />
        </label>
        <label className="text-sm text-[color:var(--brand-muted)]">
          {t("bottomPt", "Bottom (pt)")}
          <input
            type="number"
            min={0}
            name="cropBottom"
            autoComplete="off"
            value={marginBottom}
            onChange={(e) => setMarginBottom(Number(e.target.value || 0))}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-[color:var(--brand-line)]"
          />
        </label>
      </div>

      {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}

      <button
        type="button"
        disabled={!isPdf || busy}
        onClick={run}
        className="w-full h-12 rounded-xl bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50"
      >
        {busy ? t("working", "Working…") : t("cropDownload", "Crop & Download")}
      </button>
    </div>
  );
}
