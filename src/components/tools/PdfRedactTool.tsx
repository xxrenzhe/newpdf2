"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FileDropzone from "./FileDropzone";
import type { PdfRasterPreset } from "@/lib/pdf/client";
import { downloadBlob, redactPdfRasterize } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";
import { notifyPdfToolError } from "@/lib/pdf/toolFeedback";
import type { RedactionCanvasApi, RedactionMode } from "./PdfRedactionCanvas";

const PdfRedactionCanvas = dynamic(() => import("./PdfRedactionCanvas"), { ssr: false });
const PdfRedactPreview = dynamic(() => import("./PdfRedactPreview"), {
  ssr: false,
  loading: () => null,
});

type Mode = RedactionMode;

function hasRedactionObjects(json?: string) {
  if (!json) return false;
  try {
    const parsed = JSON.parse(json) as { objects?: unknown[] } | null;
    return Array.isArray(parsed?.objects) && parsed.objects.length > 0;
  } catch {
    return false;
  }
}

function createTestRedactionOverlayJson() {
  return JSON.stringify({
    version: "5.0.0",
    objects: [
      {
        type: "rect",
        left: 24,
        top: 24,
        width: 180,
        height: 96,
        scaleX: 1,
        scaleY: 1,
        fill: "#000000",
        opacity: 1,
        visible: true,
      },
    ],
  });
}

export default function PdfRedactTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });
  const [mode, setMode] = useState<Mode>("redact");
  const [preset, setPreset] = useState<PdfRasterPreset>("balanced");
  const [overlays, setOverlays] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const canvasApiRef = useRef<RedactionCanvasApi | null>(null);
  const overlaysRef = useRef<Record<number, string>>({});
  const forcedTestOverlayRef = useRef<{ pageNumber: number; json: string } | null>(null);
  const { t } = useLanguage();

  const updateOverlays = useCallback(
    (updater: (prev: Record<number, string>) => Record<number, string>) => {
      const next = updater(overlaysRef.current);
      overlaysRef.current = next;
      setOverlays(next);
    },
    []
  );

  const isPdf = useMemo(
    () => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")),
    [file]
  );

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setLoading(false);
    setPageNumber(1);
  }, []);

  const onPageLoadSuccess = useCallback((page: { width: number; height: number }) => {
    setPageDimensions({ width: page.width, height: page.height });
  }, []);

  const onOverlayChange = useCallback(
    (json: string) => {
      updateOverlays((prev) => {
        if (!hasRedactionObjects(json)) {
          if (!(pageNumber in prev)) return prev;
          const next = { ...prev };
          delete next[pageNumber];
          return next;
        }
        return { ...prev, [pageNumber]: json };
      });
    },
    [pageNumber, updateOverlays]
  );

  const clearPage = useCallback(() => {
    updateOverlays((prev) => {
      const next = { ...prev };
      delete next[pageNumber];
      return next;
    });
    setHasSelection(false);
  }, [pageNumber, updateOverlays]);

  const deleteSelection = useCallback(() => {
    canvasApiRef.current?.deleteSelection();
  }, []);

  const exportRedacted = useCallback(async () => {
    if (!file || !isPdf) return;
    setBusy(true);
    setError("");
    setProgress({ current: 0, total: 0 });
    try {
      const effectiveOverlays = { ...overlaysRef.current };
      const forcedTestOverlay = forcedTestOverlayRef.current;
      if (forcedTestOverlay) {
        effectiveOverlays[forcedTestOverlay.pageNumber] = forcedTestOverlay.json;
      }
      const currentPageJson = canvasApiRef.current?.serialize();
      if (typeof currentPageJson === "string") {
        if (hasRedactionObjects(currentPageJson)) {
          effectiveOverlays[pageNumber] = currentPageJson;
        } else {
          delete effectiveOverlays[pageNumber];
        }
      }
      const sanitized = Object.fromEntries(
        Object.entries(effectiveOverlays).filter(([, json]) => hasRedactionObjects(json))
      ) as Record<number, string>;
      const bytes = await redactPdfRasterize(file, sanitized, preset, {
        onProgress: (current, total) => setProgress({ current, total }),
      });
      const outName = file.name.replace(/\.[^.]+$/, "") + "-redacted.pdf";
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
    } catch (e) {
      setError(notifyPdfToolError(e, t("redactionFailed", "Redaction failed")));
    } finally {
      setBusy(false);
      setProgress(null);
      forcedTestOverlayRef.current = null;
    }
  }, [file, isPdf, pageNumber, preset, t]);

  useEffect(() => {
    setHasSelection(false);
  }, [pageNumber]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const runtime = window as Window & {
      __QWERPDF_TEST_SET_REDACTION_OVERLAY__?: () => Promise<void>;
      __QWERPDF_TEST_EXPORT_REDACTED_PDF__?: () => Promise<void>;
    };
    const applyTestOverlay = async () => {
      const json = createTestRedactionOverlayJson();
      forcedTestOverlayRef.current = { pageNumber, json };
      updateOverlays((prev) => ({ ...prev, [pageNumber]: json }));
      await canvasApiRef.current?.applySerializedJson(json);
    };
    runtime.__QWERPDF_TEST_SET_REDACTION_OVERLAY__ = applyTestOverlay;
    runtime.__QWERPDF_TEST_EXPORT_REDACTED_PDF__ = async () => {
      await applyTestOverlay();
      await exportRedacted();
    };
    return () => {
      delete runtime.__QWERPDF_TEST_SET_REDACTION_OVERLAY__;
      delete runtime.__QWERPDF_TEST_EXPORT_REDACTED_PDF__;
    };
  }, [exportRedacted, pageNumber, updateOverlays]);

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={(files) => setFile(files[0] ?? null)}
        title={t("dropPdfToRedact", "Drop a PDF here to redact")}
      />
    );
  }

  const viewWidth = pageDimensions.width * scale;
  const viewHeight = pageDimensions.height * scale;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 bg-[color:var(--brand-cream)] border-b border-[color:var(--brand-line)]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setFile(null)}
            className="p-2 hover:bg-[color:var(--brand-cream)] rounded-lg transition-colors"
            title={t("back", "Back")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-medium text-[color:var(--brand-ink)] truncate max-w-full sm:max-w-[360px]">{file.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setMode("redact")}
            className={`px-3 py-2 rounded-lg border ${mode === "redact" ? "border-primary bg-[color:var(--brand-lilac)]" : "border-[color:var(--brand-line)] bg-white"} text-xs sm:text-sm whitespace-nowrap`}
          >
            {t("redactMode", "Redact")}
          </button>
          <button
            type="button"
            onClick={() => setMode("select")}
            className={`px-3 py-2 rounded-lg border ${mode === "select" ? "border-primary bg-[color:var(--brand-lilac)]" : "border-[color:var(--brand-line)] bg-white"} text-xs sm:text-sm whitespace-nowrap`}
          >
            {t("selectMode", "Select")}
          </button>
          <button
            type="button"
            onClick={clearPage}
            className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] bg-white text-xs sm:text-sm hover:bg-[color:var(--brand-cream)] whitespace-nowrap"
          >
            {t("clearPage", "Clear page")}
          </button>
          <button
            type="button"
            onClick={deleteSelection}
            disabled={!hasSelection || mode !== "select"}
            className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] bg-white text-xs sm:text-sm hover:bg-[color:var(--brand-cream)] disabled:opacity-50 whitespace-nowrap"
            title={t("deleteSelectionHint", "Delete selection (Del/Backspace)")}
          >
            {t("deleteSelection", "Delete selection")}
          </button>
          <select
            className="h-10 px-3 rounded-lg border border-[color:var(--brand-line)] bg-white text-xs sm:text-sm max-w-full"
            value={preset}
            onChange={(e) => setPreset(e.target.value as PdfRasterPreset)}
            title={t("outputQuality", "Output quality")}
          >
            <option value="balanced">{t("presetBalanced", "Balanced")}</option>
            <option value="small">{t("presetSmaller", "Smaller")}</option>
            <option value="smallest">{t("presetSmallest", "Smallest")}</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={exportRedacted}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
          >
            {busy ? t("exporting", "Exporting…") : t("exportRedacted", "Export redacted PDF")}
          </button>
        </div>
      </div>

      {error && <div className="m-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>}
      {busy && progress && progress.total > 0 && (
        <div className="mx-4 mt-4">
          <div className="h-2 w-full rounded-full bg-[color:var(--brand-cream)] overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-200"
              style={{ width: `${Math.max(2, Math.round((progress.current / progress.total) * 100))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[color:var(--brand-muted)] text-center">
            {t("processingProgress", "Processing {current} / {total}")
              .replace("{current}", `${Math.min(progress.current, progress.total)}`)
              .replace("{total}", `${progress.total}`)}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b border-[color:var(--brand-line)] text-sm text-[color:var(--brand-muted)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="px-2 py-1 rounded border border-[color:var(--brand-line)] bg-white disabled:opacity-50"
          >
            {t("prev", "Prev")}
          </button>
          <span>
            {t("pageOfShort", "Page {current} / {total}")
              .replace("{current}", `${pageNumber}`)
              .replace("{total}", numPages ? `${numPages}` : "…")}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="px-2 py-1 rounded border border-[color:var(--brand-line)] bg-white disabled:opacity-50"
          >
            {t("next", "Next")}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("zoomOut", "Zoom Out")}
            className="px-2 py-1 rounded border border-[color:var(--brand-line)] bg-white"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            -
          </button>
          <span className="min-w-[52px] text-center">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            aria-label={t("zoomIn", "Zoom In")}
            className="px-2 py-1 rounded border border-[color:var(--brand-line)] bg-white"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-[color:var(--brand-line)] p-6 flex items-start justify-center min-h-[640px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        <div className="bg-white shadow-lg" style={{ width: viewWidth, height: viewHeight }}>
          <div
            className="relative origin-top-left"
            style={{
              width: pageDimensions.width,
              height: pageDimensions.height,
              transform: `scale(${scale})`,
            }}
          >
            <PdfRedactPreview
              file={file}
              pageNumber={pageNumber}
              onDocumentLoadSuccess={onDocumentLoadSuccess}
              onPageLoadSuccess={onPageLoadSuccess}
            />

            <PdfRedactionCanvas
              key={pageNumber}
              width={pageDimensions.width}
              height={pageDimensions.height}
              mode={mode}
              initialJson={overlays[pageNumber]}
              onChange={onOverlayChange}
              onSelectionChange={setHasSelection}
              onApiReady={(api) => {
                canvasApiRef.current = api;
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-3 text-xs text-[color:var(--brand-muted)] bg-[color:var(--brand-cream)] border-t border-[color:var(--brand-line)]">
        {t(
          "redactionRasterNote",
          "Only pages with redactions are rasterized to permanently remove underlying text/vectors."
        )}
      </div>
    </div>
  );
}
