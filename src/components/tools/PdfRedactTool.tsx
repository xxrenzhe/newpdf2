"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import * as fabric from "fabric";
import FileDropzone from "./FileDropzone";
import type { PdfRasterPreset } from "@/lib/pdf/client";
import { downloadBlob, redactPdfRasterize } from "@/lib/pdf/client";
import { configurePdfJsWorker } from "@/lib/pdf/pdfjs";
import { useLanguage } from "@/components/LanguageProvider";

type Mode = "select" | "redact";

type RedactionCanvasHandle = {
  deleteSelection: () => void;
  hasSelection: () => boolean;
};

const MIN_REDACTION_SIZE = 12;

function hasRedactionObjects(json?: string) {
  if (!json) return false;
  try {
    const parsed = JSON.parse(json) as { objects?: unknown[] } | null;
    return Array.isArray(parsed?.objects) && parsed.objects.length > 0;
  } catch {
    return false;
  }
}

const RedactionCanvas = forwardRef<RedactionCanvasHandle, {
  width: number;
  height: number;
  mode: Mode;
  initialJson?: string;
  onChange: (json: string) => void;
  onSelectionChange?: (hasSelection: boolean) => void;
}>(function RedactionCanvas(
  { width, height, mode, initialJson, onChange, onSelectionChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const currentRef = useRef<fabric.Rect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const syncingRef = useRef(false);

  const save = useCallback(() => {
    if (syncingRef.current) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    onChange(JSON.stringify(canvas.toJSON()));
  }, [onChange]);

  const notifySelection = useCallback(() => {
    if (!onSelectionChange) return;
    const canvas = fabricRef.current;
    onSelectionChange(!!canvas && canvas.getActiveObjects().length > 0);
  }, [onSelectionChange]);

  const deleteSelection = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (!active.length) return;
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    notifySelection();
  }, [notifySelection]);

  useImperativeHandle(ref, () => ({
    deleteSelection,
    hasSelection: () => {
      const canvas = fabricRef.current;
      return !!canvas && canvas.getActiveObjects().length > 0;
    },
  }), [deleteSelection]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      selection: true,
    });
    fabricRef.current = canvas;

    canvas.on("object:added", save);
    canvas.on("object:modified", save);
    canvas.on("object:removed", save);
    canvas.on("selection:created", notifySelection);
    canvas.on("selection:updated", notifySelection);
    canvas.on("selection:cleared", notifySelection);

    return () => {
      canvas.dispose();
    };
  }, [height, notifySelection, save, width]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width, height });
  }, [width, height]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.selection = mode === "select";
    canvas.defaultCursor = mode === "select" ? "default" : "crosshair";
    canvas.forEachObject((obj) => {
      obj.selectable = mode === "select";
      obj.evented = mode === "select";
    });
    if (mode !== "select") {
      canvas.discardActiveObject();
    }
    canvas.renderAll();
    notifySelection();
  }, [mode, notifySelection]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const load = async () => {
      syncingRef.current = true;
      canvas.clear();
      if (!initialJson) {
        canvas.renderAll();
        notifySelection();
        syncingRef.current = false;
        return;
      }

      const loadResult = (canvas as unknown as { loadFromJSON: (json: string, cb?: () => void) => unknown }).loadFromJSON(
        initialJson,
        () => {}
      );
      if (loadResult instanceof Promise) {
        await loadResult;
      } else {
        await new Promise<void>((resolve) => {
          (canvas as unknown as { loadFromJSON: (json: string, cb: () => void) => void }).loadFromJSON(
            initialJson,
            () => resolve()
          );
        });
      }
      canvas.renderAll();
      notifySelection();
      syncingRef.current = false;
    };

    void load();
  }, [initialJson, notifySelection]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const onMouseDown = (opt: fabric.TPointerEventInfo) => {
      if (mode !== "redact") return;
      const pointer = canvas.getViewportPoint(opt.e);
      startRef.current = { x: pointer.x, y: pointer.y };
      setIsDrawing(true);

      const rect = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: "#000000",
        opacity: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(rect);
      currentRef.current = rect;
    };

    const onMouseMove = (opt: fabric.TPointerEventInfo) => {
      if (!isDrawing || mode !== "redact" || !startRef.current || !currentRef.current) return;
      const pointer = canvas.getViewportPoint(opt.e);
      const startX = startRef.current.x;
      const startY = startRef.current.y;
      const rect = currentRef.current;
      rect.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
      });
      canvas.renderAll();
    };

    const onMouseUp = () => {
      if (!isDrawing || mode !== "redact") return;
      setIsDrawing(false);
      const rect = currentRef.current;
      if (rect) {
        const width = rect.width ?? 0;
        const height = rect.height ?? 0;
        if (width < MIN_REDACTION_SIZE || height < MIN_REDACTION_SIZE) {
          canvas.remove(rect);
          canvas.renderAll();
          notifySelection();
          startRef.current = null;
          currentRef.current = null;
          return;
        }
        rect.set({ selectable: true, evented: true });
      }
      startRef.current = null;
      currentRef.current = null;
      save();
    };

    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);

    return () => {
      canvas.off("mouse:down", onMouseDown);
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:up", onMouseUp);
    };
  }, [isDrawing, mode, notifySelection, save]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (mode !== "select") return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      deleteSelection();
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteSelection, mode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ touchAction: "none" }}
    />
  );
});

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
  const [hasSelection, setHasSelection] = useState(false);
  const canvasHandleRef = useRef<RedactionCanvasHandle | null>(null);
  const { t } = useLanguage();

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
      setOverlays((prev) => {
        if (!hasRedactionObjects(json)) {
          if (!(pageNumber in prev)) return prev;
          const next = { ...prev };
          delete next[pageNumber];
          return next;
        }
        return { ...prev, [pageNumber]: json };
      });
    },
    [pageNumber]
  );

  const clearPage = useCallback(() => {
    setOverlays((prev) => {
      const next = { ...prev };
      delete next[pageNumber];
      return next;
    });
    setHasSelection(false);
  }, [pageNumber]);

  const deleteSelection = useCallback(() => {
    canvasHandleRef.current?.deleteSelection();
  }, []);

  const exportRedacted = useCallback(async () => {
    if (!file || !isPdf) return;
    setBusy(true);
    setError("");
    try {
      const sanitized = Object.fromEntries(
        Object.entries(overlays).filter(([, json]) => hasRedactionObjects(json))
      ) as Record<number, string>;
      const bytes = await redactPdfRasterize(file, sanitized, preset);
      const outName = file.name.replace(/\.[^.]+$/, "") + "-redacted.pdf";
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("redactionFailed", "Redaction failed"));
    } finally {
      setBusy(false);
    }
  }, [file, isPdf, overlays, preset, t]);

  useEffect(() => {
    configurePdfJsWorker();
  }, []);

  useEffect(() => {
    setHasSelection(false);
  }, [pageNumber]);

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
            <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
              <Page
                pageNumber={pageNumber}
                scale={1}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            <RedactionCanvas
              key={pageNumber}
              width={pageDimensions.width}
              height={pageDimensions.height}
              mode={mode}
              initialJson={overlays[pageNumber]}
              onChange={onOverlayChange}
              onSelectionChange={setHasSelection}
              ref={canvasHandleRef}
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
