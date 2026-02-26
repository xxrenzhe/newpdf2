"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FileDropzone from "@/components/tools/FileDropzone";
import { downloadBlob, extractPdfPages } from "@/lib/pdf/client";
import { configurePdfJsWorkerV2, pdfjs } from "@/lib/pdf/pdfjsV2";
import { useLanguage } from "@/components/LanguageProvider";
import { notifyPdfToolError } from "@/lib/pdf/toolFeedback";

type ThumbEntry = {
  url: string;
  width: number;
  height: number;
};
type ThumbState = Record<number, ThumbEntry>;

const THUMB_WIDTH = 220;
const THUMB_QUALITY = 0.75;
const THUMB_PAGE_SIZE = 60;
const MAX_CONCURRENT_THUMB_RENDERS = 2;

function isPdfFile(file: File | null): file is File {
  return !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
}

export default function PdfDeletePagesTool({
  initialFile,
  onExit,
}: {
  initialFile?: File;
  onExit?: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [thumbs, setThumbs] = useState<ThumbState>({});
  const [deleted, setDeleted] = useState<Record<number, boolean>>({});
  const [thumbPage, setThumbPage] = useState(1);
  const { t } = useLanguage();

  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const thumbsRef = useRef<ThumbState>({});
  const renderSessionRef = useRef(0);
  const pendingThumbsRef = useRef<number[]>([]);
  const inFlightThumbsRef = useRef<Map<number, number>>(new Map());
  const activeThumbRendersRef = useRef(0);
  const createdObjectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    thumbsRef.current = thumbs;
  }, [thumbs]);

  const totalThumbPages = useMemo(() => Math.max(1, Math.ceil(numPages / THUMB_PAGE_SIZE)), [numPages]);
  const thumbPageClamped = useMemo(() => Math.min(Math.max(1, thumbPage), totalThumbPages), [thumbPage, totalThumbPages]);
  const visibleRange = useMemo(() => {
    const start = (thumbPageClamped - 1) * THUMB_PAGE_SIZE;
    const endExclusive = Math.min(numPages, start + THUMB_PAGE_SIZE);
    return { start, endExclusive };
  }, [numPages, thumbPageClamped]);
  const pageIndices = useMemo(
    () => Array.from({ length: visibleRange.endExclusive - visibleRange.start }, (_, i) => visibleRange.start + i),
    [visibleRange.endExclusive, visibleRange.start]
  );

  const deletedCount = useMemo(() => Object.values(deleted).filter(Boolean).length, [deleted]);

  const resetFileState = useCallback(() => {
    const prevDoc = docRef.current;
    docRef.current = null;

    renderSessionRef.current += 1;
    pendingThumbsRef.current = [];
    inFlightThumbsRef.current.clear();
    activeThumbRendersRef.current = 0;

    setNumPages(0);
    setThumbs({});
    setDeleted({});
    setThumbPage(1);

    for (const url of createdObjectUrlsRef.current) URL.revokeObjectURL(url);
    createdObjectUrlsRef.current = [];

    if (prevDoc) void prevDoc.destroy().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    if (onExit) {
      onExit();
      return;
    }
    router.push("/");
  }, [onExit, router]);

  const drainThumbQueue = useCallback(() => {
    const doc = docRef.current;
    if (!doc) return;

    while (
      activeThumbRendersRef.current < MAX_CONCURRENT_THUMB_RENDERS &&
      pendingThumbsRef.current.length > 0
    ) {
      const pageIndex = pendingThumbsRef.current.shift();
      if (pageIndex === undefined) break;

      const sessionId = renderSessionRef.current;
      if (inFlightThumbsRef.current.get(pageIndex) !== sessionId) continue;
      if (thumbsRef.current[pageIndex]) {
        inFlightThumbsRef.current.delete(pageIndex);
        continue;
      }

      activeThumbRendersRef.current += 1;

      void (async () => {
        try {
          const page = await doc.getPage(pageIndex + 1);
          if (renderSessionRef.current !== sessionId) {
            (page as { cleanup?: () => void }).cleanup?.();
            return;
          }

          const viewport0 = page.getViewport({ scale: 1 });
          const scale = THUMB_WIDTH / Math.max(1, viewport0.width);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const thumbWidth = Math.ceil(viewport.width);
          const thumbHeight = Math.ceil(viewport.height);
          canvas.width = thumbWidth;
          canvas.height = thumbHeight;
          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) return;

          await page.render({ canvasContext: ctx, canvas, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", THUMB_QUALITY));
          const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/jpeg", THUMB_QUALITY);

          canvas.width = 0;
          canvas.height = 0;
          (page as { cleanup?: () => void }).cleanup?.();

          if (renderSessionRef.current !== sessionId) {
            if (blob) URL.revokeObjectURL(url);
            return;
          }

          if (blob) createdObjectUrlsRef.current.push(url);
          setThumbs((prev) => ({ ...prev, [pageIndex]: { url, width: thumbWidth, height: thumbHeight } }));
        } catch {
          // Ignore thumbnail errors; the grid can still function without them.
        } finally {
          if (inFlightThumbsRef.current.get(pageIndex) === sessionId) {
            inFlightThumbsRef.current.delete(pageIndex);
          }
          if (renderSessionRef.current === sessionId) {
            activeThumbRendersRef.current = Math.max(0, activeThumbRendersRef.current - 1);
            drainThumbQueue();
          }
        }
      })();
    }
  }, []);

  const queueThumbRender = useCallback(
    (pageIndex: number) => {
      const sessionId = renderSessionRef.current;
      if (thumbsRef.current[pageIndex]) return;
      if (inFlightThumbsRef.current.get(pageIndex) === sessionId) return;

      inFlightThumbsRef.current.set(pageIndex, sessionId);
      pendingThumbsRef.current.push(pageIndex);
      pendingThumbsRef.current.sort((a, b) => a - b);
      drainThumbQueue();
    },
    [drainThumbQueue]
  );

  useEffect(() => {
    if (!isPdfFile(file)) return;
    configurePdfJsWorkerV2();
    let cancelled = false;

    const run = async () => {
      setError("");
      resetFileState();
      const data = new Uint8Array(await file.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      if (cancelled) {
        void doc.destroy().catch(() => {});
        return;
      }
      docRef.current = doc;
      setNumPages(doc.numPages);
    };

    void run().catch((e) => setError(notifyPdfToolError(e, t("loadPdfFailed", "Failed to load PDF"))));
    return () => {
      cancelled = true;
    };
  }, [file, resetFileState, t]);

  useEffect(() => {
    const inFlightThumbs = inFlightThumbsRef.current;
    return () => {
      const prevDoc = docRef.current;
      docRef.current = null;
      renderSessionRef.current += 1;
      pendingThumbsRef.current = [];
      inFlightThumbs.clear();
      activeThumbRendersRef.current = 0;
      for (const url of createdObjectUrlsRef.current) URL.revokeObjectURL(url);
      createdObjectUrlsRef.current = [];
      if (prevDoc) void prevDoc.destroy().catch(() => {});
    };
  }, []);

  const toggleDelete = useCallback((pageIndex: number) => {
    setDeleted((prev) => ({ ...prev, [pageIndex]: !prev[pageIndex] }));
  }, []);

  const exportPdf = useCallback(async () => {
    if (!isPdfFile(file)) return;
    setBusy(true);
    setError("");
    try {
      if (numPages === 0) throw new Error(t("pdfNotLoaded", "PDF not loaded."));
      const keepPages = Array.from({ length: numPages }, (_, i) => i + 1).filter((n) => !deleted[n - 1]);
      if (keepPages.length === 0) throw new Error(t("deleteAllPagesError", "You cannot delete all pages."));

      const bytes = await extractPdfPages(file, keepPages);
      const outName = file.name.replace(/\.[^.]+$/, "") + "-deleted.pdf";
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
    } catch (e) {
      setError(notifyPdfToolError(e, t("exportFailed", "Export failed")));
    } finally {
      setBusy(false);
    }
  }, [deleted, file, numPages, t]);

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={(files) => setFile(files[0] ?? null)}
        title={t("dropPdfToDeletePages", "Drop a PDF here to delete pages")}
      />
    );
  }

  const pdfOk = isPdfFile(file);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
              {t("deletePagesTitle", "Delete Pages")}
            </h3>
            <p className="text-sm text-[color:var(--brand-muted)] truncate">
              {file.name}
              {numPages ? ` | ${t("pageCount", "{count} pages").replace("{count}", `${numPages}`)}` : ""}
              {deletedCount
                ? ` | ${t("markedForDeletion", "{count} marked for deletion").replace("{count}", `${deletedCount}`)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:shrink-0">
            <button
              type="button"
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] text-sm flex items-center justify-center"
              onClick={exit}
              disabled={busy}
            >
              <span className="min-w-0 truncate">{t("exit", "Exit")}</span>
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] text-sm flex items-center justify-center"
              onClick={() => (onExit ? onExit() : setFile(null))}
              disabled={busy}
            >
              <span className="min-w-0 truncate">{t("changeFile", "Change file")}</span>
            </button>
            <button
              type="button"
              disabled={!pdfOk || numPages === 0 || busy}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50 whitespace-nowrap"
              onClick={() => void exportPdf()}
            >
              {busy ? t("working", "Working...") : t("exportPdf", "Export PDF")}
            </button>
          </div>
        </div>

        {!pdfOk && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {t("uploadPdfOnly", "Please upload a PDF file.")}
          </div>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      {numPages > 0 && (
        <div className="bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
            <p className="text-sm text-[color:var(--brand-muted)]">
              {t("pagesRangeOfTotal", "Pages {start}-{end} of {total}")
                .replace("{start}", `${visibleRange.start + 1}`)
                .replace("{end}", `${visibleRange.endExclusive}`)
                .replace("{total}", `${numPages}`)}
            </p>
            {totalThumbPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
                  onClick={() => setThumbPage((p) => Math.max(1, p - 1))}
                  disabled={thumbPageClamped <= 1}
                >
                  {t("prev", "Prev")}
                </button>
                <span className="text-sm text-[color:var(--brand-muted)] tabular-nums">
                  {thumbPageClamped} / {totalThumbPages}
                </span>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
                  onClick={() => setThumbPage((p) => Math.min(totalThumbPages, p + 1))}
                  disabled={thumbPageClamped >= totalThumbPages}
                >
                  {t("next", "Next")}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {pageIndices.map((pageIndex) => (
              <DeletePageCard
                key={pageIndex}
                pageIndex={pageIndex}
                thumb={thumbs[pageIndex]}
                marked={!!deleted[pageIndex]}
                t={t}
                onToggle={toggleDelete}
                onNeedThumb={queueThumbRender}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DeletePageCard = memo(function DeletePageCard({
  pageIndex,
  thumb,
  marked,
  t,
  onToggle,
  onNeedThumb,
}: {
  pageIndex: number;
  thumb?: ThumbEntry;
  marked: boolean;
  t: (key: string, fallback?: string) => string;
  onToggle: (pageIndex: number) => void;
  onNeedThumb: (pageIndex: number) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || thumb) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          onNeedThumb(pageIndex);
          observer.disconnect();
          return;
        }
      },
      { root: null, rootMargin: "400px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onNeedThumb, pageIndex, thumb]);

  return (
    <button
      ref={ref}
      type="button"
      className={`rounded-xl border overflow-hidden text-left ${
        marked ? "border-red-400 bg-red-50/30" : "border-[color:var(--brand-line)] bg-white hover:bg-[color:var(--brand-cream)]"
      }`}
      onClick={() => onToggle(pageIndex)}
      title={
        marked
          ? t("deletePageKeepHint", "Click to keep this page")
          : t("deletePageRemoveHint", "Click to delete this page")
      }
    >
      <div className="flex items-center justify-between px-2 py-1.5 bg-[color:var(--brand-cream)]">
        <span className="text-xs text-[color:var(--brand-muted)]">
          {t("pageLabel", "Page {count}").replace("{count}", `${pageIndex + 1}`)}
        </span>
        {marked && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {t("delete", "Delete")}
          </span>
        )}
      </div>
      <div className="p-2">
        {thumb ? (
          <img
            src={thumb.url}
            alt=""
            width={thumb.width}
            height={thumb.height}
            loading="lazy"
            className={`w-full rounded-lg border border-[color:var(--brand-line)] ${marked ? "opacity-60" : ""}`}
          />
        ) : (
          <div className="w-full aspect-[3/4] rounded-lg bg-[color:var(--brand-cream)]" />
        )}
      </div>
    </button>
  );
});
