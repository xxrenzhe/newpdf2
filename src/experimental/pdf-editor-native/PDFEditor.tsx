"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Document, Page } from "react-pdf";
import dynamic from "next/dynamic";
import AnnotationToolbar from "@/components/AnnotationToolbar";
import type { AnnotationTool } from "@/components/PDFAnnotationCanvas";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { configurePdfJsWorker } from "@/lib/pdf/pdfjs";
import { applyAnnotationOverlays, downloadBlob, type PdfTextReplacementItem } from "@/lib/pdf/client";
import { useLanguage } from "@/components/LanguageProvider";

// Dynamically import annotation canvas
const PDFAnnotationCanvas = dynamic(() => import("@/components/PDFAnnotationCanvas"), {
  ssr: false,
});

interface PDFEditorProps {
  file: File | string;
  fileName: string;
  onSave?: (annotatedPdf: Blob) => void;
  onClose?: () => void;
}

type PageHistoryEntry = {
  stack: string[];
  index: number;
};

type TextEditDraft = {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  originalValue: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  sourceKey: string;
};

const EMPTY_ANNOTATIONS_JSON = "{}";
const HISTORY_LIMIT = 100;
const DEFAULT_PAGE_DIMENSIONS = { width: 612, height: 792 };
const TEXT_SOURCE_KEY_PRECISION = 10;
const PAGE_GAP_PX = 24;
const VIRTUAL_OVERSCAN_MIN_PX = 1200;
const VIRTUAL_OVERSCAN_MAX_EXTRA_PX = 2600;

type PageLayoutItem = {
  pageNumber: number;
  top: number;
  width: number;
  height: number;
  dimensions: { width: number; height: number };
};

function findFirstPageIndexByBottom(items: PageLayoutItem[], offset: number) {
  let left = 0;
  let right = items.length - 1;
  let answer = items.length;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const item = items[mid];
    const itemBottom = item.top + item.height;
    if (itemBottom >= offset) {
      answer = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return answer;
}

function findLastPageIndexByTop(items: PageLayoutItem[], offset: number) {
  let left = 0;
  let right = items.length - 1;
  let answer = -1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const item = items[mid];
    if (item.top <= offset) {
      answer = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return answer;
}

function findNearestPageIndexByMiddle(items: PageLayoutItem[], offset: number) {
  if (items.length === 0) return -1;
  const firstBottomIndex = findFirstPageIndexByBottom(items, offset);
  if (firstBottomIndex <= 0) return 0;
  if (firstBottomIndex >= items.length) return items.length - 1;

  const prev = items[firstBottomIndex - 1];
  const next = items[firstBottomIndex];
  const prevDistance = Math.abs(prev.top + prev.height / 2 - offset);
  const nextDistance = Math.abs(next.top + next.height / 2 - offset);
  return nextDistance < prevDistance ? firstBottomIndex : firstBottomIndex - 1;
}

function normalizeAnnotationJson(value: string | undefined) {
  const next = typeof value === "string" ? value.trim() : "";
  return next.length > 0 ? next : EMPTY_ANNOTATIONS_JSON;
}

function buildTextSourceKey(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  originalText: string;
}) {
  const normalizedText = input.originalText.trim();
  const x = Math.round(input.x * TEXT_SOURCE_KEY_PRECISION) / TEXT_SOURCE_KEY_PRECISION;
  const y = Math.round(input.y * TEXT_SOURCE_KEY_PRECISION) / TEXT_SOURCE_KEY_PRECISION;
  const width = Math.round(input.width * TEXT_SOURCE_KEY_PRECISION) / TEXT_SOURCE_KEY_PRECISION;
  const height = Math.round(input.height * TEXT_SOURCE_KEY_PRECISION) / TEXT_SOURCE_KEY_PRECISION;
  return `${x}|${y}|${width}|${height}|${normalizedText}`;
}

export default function PDFEditor({ file, fileName, onSave, onClose }: PDFEditorProps) {
  configurePdfJsWorker();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [pageDimensionsByPage, setPageDimensionsByPage] = useState<Record<number, { width: number; height: number }>>({});

  // Annotation state
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#5b4bb7");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState<Record<number, string>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [textEditDraft, setTextEditDraft] = useState<TextEditDraft | null>(null);
  const [textReplacementsByPage, setTextReplacementsByPage] = useState<Record<number, PdfTextReplacementItem[]>>({});
  const [viewportState, setViewportState] = useState<{ scrollTop: number; height: number; velocity: number }>({
    scrollTop: 0,
    height: 0,
    velocity: 0,
  });
  const { t } = useLanguage();
  const toolLabels = useMemo(
    () => ({
      select: t("toolSelect", "Select"),
      editText: t("toolEditText", "Edit Text"),
      addText: t("toolAddText", "Add Text"),
      highlight: t("toolHighlight", "Highlight"),
      rectangle: t("toolRectangle", "Rectangle"),
      circle: t("toolCircle", "Circle"),
      arrow: t("toolArrow", "Arrow"),
      line: t("toolLine", "Line"),
      freehand: t("toolDraw", "Draw"),
      eraser: t("toolEraser", "Eraser"),
    }),
    [t]
  );
  const activeToolLabel = toolLabels[activeTool] ?? activeTool;
  const currentPageDimensions = pageDimensionsByPage[pageNumber] ?? DEFAULT_PAGE_DIMENSIONS;

  const containerRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Record<number, PageHistoryEntry>>({});
  const textEditDraftRef = useRef<TextEditDraft | null>(null);
  const skipTextCommitOnBlurRef = useRef(false);
  const scrollSyncRafRef = useRef<number | null>(null);
  const scrollSampleRef = useRef<{ top: number; time: number } | null>(null);

  const syncHistoryState = useCallback((page: number) => {
    const entry = historyRef.current[page];
    setCanUndo(Boolean(entry && entry.index > 0));
    setCanRedo(Boolean(entry && entry.index < entry.stack.length - 1));
  }, []);

  const pushPageHistory = useCallback((page: number, snapshot: string) => {
    const normalized = normalizeAnnotationJson(snapshot);
    const current = historyRef.current[page];
    if (!current || current.stack.length === 0) {
      historyRef.current[page] = { stack: [normalized], index: 0 };
      return;
    }

    const activeSnapshot = current.stack[current.index] ?? EMPTY_ANNOTATIONS_JSON;
    if (activeSnapshot === normalized) return;

    const nextStack = current.stack.slice(0, current.index + 1);
    nextStack.push(normalized);
    if (nextStack.length > HISTORY_LIMIT) {
      nextStack.splice(0, nextStack.length - HISTORY_LIMIT);
    }
    historyRef.current[page] = {
      stack: nextStack,
      index: nextStack.length - 1,
    };
  }, []);

  const applySnapshotToPage = useCallback((page: number, snapshot: string) => {
    const normalized = normalizeAnnotationJson(snapshot);
    setAnnotations((prev) => {
      if (prev[page] === normalized) return prev;
      return {
        ...prev,
        [page]: normalized,
      };
    });
  }, []);

  useEffect(() => {
    historyRef.current = {};
    setAnnotations({});
    setPageNumber(1);
    setNumPages(0);
    setLoading(true);
    setPageDimensionsByPage({});
    setCanUndo(false);
    setCanRedo(false);
    setExporting(false);
    setExportProgress(null);
    setTextEditDraft(null);
    setTextReplacementsByPage({});
    setViewportState({ scrollTop: 0, height: 0, velocity: 0 });
    scrollSampleRef.current = null;
    skipTextCommitOnBlurRef.current = false;
    if (scrollSyncRafRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(scrollSyncRafRef.current);
      scrollSyncRafRef.current = null;
    }
  }, [file]);

  useEffect(() => {
    textEditDraftRef.current = textEditDraft;
  }, [textEditDraft]);

  useEffect(() => {
    textEditDraftRef.current = null;
    setTextEditDraft(null);
    skipTextCommitOnBlurRef.current = false;
  }, [activeTool, pageNumber]);

  useEffect(() => {
    const currentPageAnnotation = normalizeAnnotationJson(annotations[pageNumber]);
    const current = historyRef.current[pageNumber];
    if (!current || current.stack.length === 0) {
      historyRef.current[pageNumber] = {
        stack: [currentPageAnnotation],
        index: 0,
      };
    }
    syncHistoryState(pageNumber);
  }, [annotations, pageNumber, syncHistoryState]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const onPageLoadSuccess = useCallback((targetPage: number, page: { width: number; height: number }) => {
    const dims = { width: page.width, height: page.height };
    setPageDimensionsByPage((prev) => {
      const current = prev[targetPage];
      if (current && current.width === dims.width && current.height === dims.height) {
        return prev;
      }
      return {
        ...prev,
        [targetPage]: dims,
      };
    });
  }, []);

  const estimatedPageDimensions = useMemo(() => {
    const values = Object.values(pageDimensionsByPage);
    if (values.length === 0) return DEFAULT_PAGE_DIMENSIONS;
    const total = values.reduce(
      (acc, dims) => ({
        width: acc.width + dims.width,
        height: acc.height + dims.height,
      }),
      { width: 0, height: 0 }
    );
    return {
      width: total.width / values.length,
      height: total.height / values.length,
    };
  }, [pageDimensionsByPage]);

  const pageLayout = useMemo(() => {
    let top = 0;
    let maxWidth = estimatedPageDimensions.width * scale;
    const items: PageLayoutItem[] = [];

    for (let page = 1; page <= numPages; page += 1) {
      const dimensions = pageDimensionsByPage[page] ?? estimatedPageDimensions;
      const scaledWidth = dimensions.width * scale;
      const scaledHeight = dimensions.height * scale;
      maxWidth = Math.max(maxWidth, scaledWidth);
      items.push({
        pageNumber: page,
        top,
        width: scaledWidth,
        height: scaledHeight,
        dimensions,
      });
      top += scaledHeight + PAGE_GAP_PX;
    }

    const totalHeight = items.length > 0 ? Math.max(0, top - PAGE_GAP_PX) : 0;
    return {
      items,
      totalHeight,
      maxWidth,
    };
  }, [estimatedPageDimensions, numPages, pageDimensionsByPage, scale]);

  const syncViewportStateFromContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container || pageLayout.items.length === 0) return;
    const nextScrollTop = container.scrollTop;
    const nextHeight = container.clientHeight;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const previousSample = scrollSampleRef.current;
    let velocity = 0;
    if (previousSample) {
      const elapsed = now - previousSample.time;
      if (elapsed > 0) {
        velocity = Math.abs(nextScrollTop - previousSample.top) / elapsed;
      }
    }
    scrollSampleRef.current = { top: nextScrollTop, time: now };

    setViewportState((prev) => {
      if (prev.scrollTop === nextScrollTop && prev.height === nextHeight && prev.velocity === velocity) return prev;
      return {
        scrollTop: nextScrollTop,
        height: nextHeight,
        velocity,
      };
    });

    const viewportMiddle = nextScrollTop + nextHeight / 2;
    const nearestIndex = findNearestPageIndexByMiddle(pageLayout.items, viewportMiddle);
    const closestPage = nearestIndex >= 0 ? pageLayout.items[nearestIndex].pageNumber : pageNumber;
    if (closestPage !== pageNumber) {
      setPageNumber(closestPage);
    }
  }, [pageLayout.items, pageNumber]);

  const handleViewportScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    if (scrollSyncRafRef.current !== null) {
      window.cancelAnimationFrame(scrollSyncRafRef.current);
    }
    scrollSyncRafRef.current = window.requestAnimationFrame(() => {
      scrollSyncRafRef.current = null;
      syncViewportStateFromContainer();
    });
  }, [syncViewportStateFromContainer]);

  const scrollToPage = useCallback((targetPage: number, behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    const targetItem = pageLayout.items[targetPage - 1];
    if (!container || !targetItem) return;
    const top = Math.max(targetItem.top - 16, 0);
    container.scrollTo({ top, behavior });
  }, [pageLayout.items]);

  const goToPage = useCallback((targetPage: number, behavior: ScrollBehavior = "smooth") => {
    if (numPages <= 0) return;
    const clamped = Math.max(1, Math.min(targetPage, numPages));
    setPageNumber(clamped);
    scrollToPage(clamped, behavior);
  }, [numPages, scrollToPage]);

  const goToPrevPage = useCallback(() => {
    goToPage(pageNumber - 1);
  }, [goToPage, pageNumber]);
  const goToNextPage = useCallback(() => {
    goToPage(pageNumber + 1);
  }, [goToPage, pageNumber]);

  useEffect(() => {
    syncViewportStateFromContainer();
  }, [syncViewportStateFromContainer]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      if (scrollSyncRafRef.current !== null) {
        window.cancelAnimationFrame(scrollSyncRafRef.current);
      }
      scrollSyncRafRef.current = window.requestAnimationFrame(() => {
        scrollSyncRafRef.current = null;
        syncViewportStateFromContainer();
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [syncViewportStateFromContainer]);
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  const handleAnnotationsChange = useCallback((targetPage: number, annotationJson: string) => {
    const normalized = normalizeAnnotationJson(annotationJson);
    setAnnotations((prev) => {
      if (prev[targetPage] === normalized) return prev;
      return {
        ...prev,
        [targetPage]: normalized,
      };
    });
    pushPageHistory(targetPage, normalized);
    if (targetPage === pageNumber) {
      syncHistoryState(targetPage);
    }
  }, [pageNumber, pushPageHistory, syncHistoryState]);

  const handleClearAnnotations = useCallback(() => {
    const currentPage = pageNumber;
    applySnapshotToPage(currentPage, EMPTY_ANNOTATIONS_JSON);
    pushPageHistory(currentPage, EMPTY_ANNOTATIONS_JSON);
    syncHistoryState(currentPage);
    setTextReplacementsByPage((prev) => {
      if (!(currentPage in prev)) return prev;
      const next = { ...prev };
      delete next[currentPage];
      return next;
    });
    textEditDraftRef.current = null;
    setTextEditDraft(null);
  }, [applySnapshotToPage, pageNumber, pushPageHistory, syncHistoryState]);

  const handleUndo = useCallback(() => {
    const currentPage = pageNumber;
    const current = historyRef.current[currentPage];
    if (!current || current.index <= 0) return;
    const nextIndex = current.index - 1;
    const snapshot = current.stack[nextIndex] ?? EMPTY_ANNOTATIONS_JSON;
    historyRef.current[currentPage] = {
      ...current,
      index: nextIndex,
    };
    applySnapshotToPage(currentPage, snapshot);
    syncHistoryState(currentPage);
  }, [applySnapshotToPage, pageNumber, syncHistoryState]);

  const handleRedo = useCallback(() => {
    const currentPage = pageNumber;
    const current = historyRef.current[currentPage];
    if (!current || current.index >= current.stack.length - 1) return;
    const nextIndex = current.index + 1;
    const snapshot = current.stack[nextIndex] ?? EMPTY_ANNOTATIONS_JSON;
    historyRef.current[currentPage] = {
      ...current,
      index: nextIndex,
    };
    applySnapshotToPage(currentPage, snapshot);
    syncHistoryState(currentPage);
  }, [applySnapshotToPage, pageNumber, syncHistoryState]);

  const commitTextEdit = useCallback((nextValueOverride?: string) => {
    const current = textEditDraftRef.current;
    if (!current) return;
    const targetPage = current.pageNumber;
    const rawNextValue = typeof nextValueOverride === "string" ? nextValueOverride : current.value;
    const nextValue = rawNextValue.trim();
    const originalValue = current.originalValue.trim();
    textEditDraftRef.current = null;
    setTextEditDraft(null);
    setTextReplacementsByPage((prev) => {
      const currentItems = prev[targetPage] ?? [];
      const existingIndex = currentItems.findIndex((item) => item.sourceKey === current.sourceKey);

      if (!nextValue || nextValue === originalValue) {
        if (existingIndex < 0) return prev;
        const nextItems = currentItems.filter((_, index) => index !== existingIndex);
        if (nextItems.length === 0) {
          const next = { ...prev };
          delete next[targetPage];
          return next;
        }
        return {
          ...prev,
          [targetPage]: nextItems,
        };
      }

      const replacement: PdfTextReplacementItem = {
        id: current.sourceKey,
        sourceKey: current.sourceKey,
        x: current.x,
        y: current.y,
        width: current.width,
        height: current.height,
        text: rawNextValue,
        fontSize: current.fontSize,
        fontFamily: current.fontFamily,
        fontWeight: current.fontWeight,
        fontStyle: current.fontStyle,
        color: current.color,
      };
      const nextItems =
        existingIndex >= 0
          ? currentItems.map((item, index) => (index === existingIndex ? replacement : item))
          : [...currentItems, replacement];
      return {
        ...prev,
        [targetPage]: nextItems,
      };
    });
  }, []);

  const cancelTextEdit = useCallback(() => {
    skipTextCommitOnBlurRef.current = true;
    textEditDraftRef.current = null;
    setTextEditDraft(null);
  }, []);

  const handlePageLayerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, targetPage: number) => {
      if (activeTool !== "editText") return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-text-edit-input='true']")) return;

      const textNode = target.closest(".react-pdf__Page__textContent span");
      if (!(textNode instanceof HTMLElement)) {
        setTextEditDraft(null);
        return;
      }

      const pageLayerEl = event.currentTarget;

      const text = textNode.textContent || "";
      if (text.trim().length === 0) {
        setTextEditDraft(null);
        return;
      }

      const layerRect = pageLayerEl.getBoundingClientRect();
      const textRect = textNode.getBoundingClientRect();
      const computed = window.getComputedStyle(textNode);
      const safeScale = Math.max(scale, 0.001);
      const computedFontSize = Number.parseFloat(computed.fontSize);
      const fontSize = Number.isFinite(computedFontSize)
        ? computedFontSize
        : Math.max(8, textRect.height / safeScale);
      const x = (textRect.left - layerRect.left) / safeScale;
      const y = (textRect.top - layerRect.top) / safeScale;
      const width = Math.max(textRect.width / safeScale, 48);
      const height = Math.max(textRect.height / safeScale, fontSize * 1.2);
      const sourceKey = buildTextSourceKey({
        x,
        y,
        width,
        height,
        originalText: text,
      });
      const existingReplacement = (textReplacementsByPage[targetPage] ?? []).find(
        (item) => item.sourceKey === sourceKey
      );

      setPageNumber(targetPage);
      setTextEditDraft({
        pageNumber: targetPage,
        x,
        y,
        width,
        height,
        value: existingReplacement?.text ?? text,
        originalValue: text,
        fontSize: Math.max(8, fontSize),
        fontFamily: existingReplacement?.fontFamily || computed.fontFamily || "Arial",
        fontWeight: existingReplacement?.fontWeight || computed.fontWeight || "400",
        fontStyle: existingReplacement?.fontStyle || computed.fontStyle || "normal",
        color: existingReplacement?.color || computed.color || "#111827",
        sourceKey,
      });
    },
    [activeTool, scale, textReplacementsByPage]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          return;
        }
        if (containerRef.current && !containerRef.current.contains(target)) {
          return;
        }
      }

      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (key === "y") {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRedo, handleUndo]);

  const handleExport = useCallback(async (opts: { onProgress?: (current: number, total: number) => void } = {}) => {
    if (!(file instanceof File)) return null;
    const exportAnnotations = Object.entries(annotations).reduce<Record<number, string>>((acc, [key, value]) => {
      const normalized = normalizeAnnotationJson(value);
      if (normalized === EMPTY_ANNOTATIONS_JSON) return acc;
      const page = Number.parseInt(key, 10);
      if (!Number.isFinite(page) || page <= 0) return acc;
      acc[page] = normalized;
      return acc;
    }, {});
    const exportTextReplacements = Object.entries(textReplacementsByPage).reduce<Record<number, PdfTextReplacementItem[]>>(
      (acc, [key, items]) => {
        const page = Number.parseInt(key, 10);
        if (!Number.isFinite(page) || page <= 0 || !Array.isArray(items)) return acc;
        const normalizedItems = items.filter((item) => typeof item.text === "string" && item.text.trim().length > 0);
        if (normalizedItems.length === 0) return acc;
        acc[page] = normalizedItems;
        return acc;
      },
      {}
    );
    if (Object.keys(exportAnnotations).length === 0 && Object.keys(exportTextReplacements).length === 0) {
      return new Uint8Array(await file.arrayBuffer());
    }
    return applyAnnotationOverlays(file, exportAnnotations, currentPageDimensions, {
      onProgress: opts.onProgress,
      yieldEveryPages: 2,
      pageSizesByPage: pageDimensionsByPage,
      textReplacementsByPage: exportTextReplacements,
    });
  }, [annotations, currentPageDimensions, file, pageDimensionsByPage, textReplacementsByPage]);

  const runExportAction = useCallback(
    async (onDone: (bytes: Uint8Array) => void | Promise<void>) => {
      if (!(file instanceof File) || exporting) return;
      setExporting(true);
      setExportProgress(null);
      try {
        const bytes = await handleExport({
          onProgress: (current, total) => {
            setExportProgress({ current, total });
          },
        });
        if (!bytes) return;
        await onDone(bytes);
      } finally {
        setExporting(false);
        setExportProgress(null);
      }
    },
    [exporting, file, handleExport]
  );

  const handleDownload = useCallback(async () => {
    await runExportAction(async (bytes) => {
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), fileName || "document.pdf");
    });
  }, [fileName, runExportAction]);

  const handleSave = useCallback(async () => {
    await runExportAction(async (bytes) => {
      onSave?.(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }));
    });
  }, [onSave, runExportAction]);
  const annotatedPageCount = useMemo(
    () =>
      Object.values(annotations).reduce((count, value) => {
        return normalizeAnnotationJson(value) === EMPTY_ANNOTATIONS_JSON ? count : count + 1;
      }, 0),
    [annotations]
  );
  const textEditedPageCount = useMemo(
    () =>
      Object.values(textReplacementsByPage).reduce((count, items) => {
        const hasNonEmptyText = items.some((item) => typeof item.text === "string" && item.text.trim().length > 0);
        return hasNonEmptyText ? count + 1 : count;
      }, 0),
    [textReplacementsByPage]
  );
  const changedPageCount = useMemo(() => {
    const pages = new Set<number>();
    Object.entries(annotations).forEach(([key, value]) => {
      if (normalizeAnnotationJson(value) === EMPTY_ANNOTATIONS_JSON) return;
      const page = Number.parseInt(key, 10);
      if (Number.isFinite(page) && page > 0) {
        pages.add(page);
      }
    });
    Object.entries(textReplacementsByPage).forEach(([key, items]) => {
      const page = Number.parseInt(key, 10);
      if (!Number.isFinite(page) || page <= 0) return;
      if (items.some((item) => typeof item.text === "string" && item.text.trim().length > 0)) {
        pages.add(page);
      }
    });
    return pages.size;
  }, [annotations, textReplacementsByPage]);
  const exportProgressText = useMemo(() => {
    if (!exporting) return "";
    if (!exportProgress || exportProgress.total <= 0) {
      return t("exportingPdf", "Exporting PDF...");
    }
    const percent = Math.round((exportProgress.current / exportProgress.total) * 100);
    return t("exportingPdfProgress", "Exporting {current}/{total} ({percent}%)")
      .replace("{current}", `${exportProgress.current}`)
      .replace("{total}", `${exportProgress.total}`)
      .replace("{percent}", `${percent}`);
  }, [exportProgress, exporting, t]);

  const virtualizedPages = useMemo(() => {
    if (numPages <= 0) return [] as number[];
    if (viewportState.height <= 0) {
      const fallbackStart = Math.max(1, pageNumber - 1);
      const fallbackEnd = Math.min(numPages, pageNumber + 1);
      const fallbackPages: number[] = [];
      for (let page = fallbackStart; page <= fallbackEnd; page += 1) {
        fallbackPages.push(page);
      }
      return fallbackPages;
    }

    const baseOverscan = Math.max(VIRTUAL_OVERSCAN_MIN_PX, viewportState.height);
    const dynamicOverscan = Math.min(
      VIRTUAL_OVERSCAN_MAX_EXTRA_PX,
      Math.max(0, viewportState.velocity) * 1200
    );
    const overscan = baseOverscan + dynamicOverscan;
    const visibleStart = Math.max(0, viewportState.scrollTop - overscan);
    const visibleEnd = viewportState.scrollTop + viewportState.height + overscan;
    const startIndex = findFirstPageIndexByBottom(pageLayout.items, visibleStart);
    const endIndex = findLastPageIndexByTop(pageLayout.items, visibleEnd);
    const pages: number[] = [];
    if (startIndex <= endIndex && startIndex >= 0 && endIndex < pageLayout.items.length) {
      for (let index = startIndex; index <= endIndex; index += 1) {
        pages.push(pageLayout.items[index].pageNumber);
      }
    }

    if (pages.length === 0) {
      pages.push(pageNumber);
    }
    return pages;
  }, [numPages, pageLayout.items, pageNumber, viewportState.height, viewportState.scrollTop, viewportState.velocity]);

  useEffect(() => {
    return () => {
      if (scrollSyncRafRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollSyncRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (numPages <= 0 || loading) return;
    syncViewportStateFromContainer();
  }, [loading, numPages, pageLayout.items, scale, syncViewportStateFromContainer]);

  return (
    <div className="flex h-full bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Annotation Toolbar */}
      <AnnotationToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        strokeWidth={strokeWidth}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onClear={handleClearAnnotations}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--brand-cream)] border-b border-[color:var(--brand-line)]">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                aria-label={t("back", "Back")}
                className="p-2 hover:bg-[color:var(--brand-cream)] rounded-lg transition-colors"
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[color:var(--brand-purple)] rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">PDF</span>
              </div>
              <span className="font-medium text-[color:var(--brand-ink)] truncate max-w-[200px]">
                {fileName}
              </span>
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              aria-label={t("prevPage", "Previous page")}
              className="p-2 rounded-lg hover:bg-[color:var(--brand-cream)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm text-[color:var(--brand-muted)] min-w-[80px] text-center">
              {t("pageOf", "Page {current} of {total}")
                .replace("{current}", `${pageNumber}`)
                .replace("{total}", `${numPages}`)}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              aria-label={t("nextPage", "Next page")}
              className="p-2 rounded-lg hover:bg-[color:var(--brand-cream)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              aria-label={t("zoomOut", "Zoom Out")}
              className="p-2 rounded-lg hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
              title={t("zoomOut", "Zoom Out")}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              aria-label={t("resetZoom", "Reset zoom")}
              className="text-sm text-[color:var(--brand-muted)] min-w-[50px] text-center hover:bg-[color:var(--brand-cream)] px-2 py-1 rounded"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              aria-label={t("zoomIn", "Zoom In")}
              className="p-2 rounded-lg hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
              title={t("zoomIn", "Zoom In")}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[color:var(--brand-line)] rounded-lg hover:bg-[color:var(--brand-cream)] text-[color:var(--brand-ink)] font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {exporting ? t("exporting", "Exporting...") : t("download", "Download")}
            </button>
            <button
              onClick={handleSave}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {exporting ? t("exporting", "Exporting...") : t("saveChanges", "Save Changes")}
            </button>
          </div>
        </div>

        {/* PDF Viewer with Annotation Canvas */}
        <div
          ref={containerRef}
          onScroll={handleViewportScroll}
          className="relative flex-1 overflow-auto bg-[color:var(--brand-cream)] p-8"
        >
          {loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          <Document file={file} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
            <div
              className="relative mx-auto"
              style={{ width: pageLayout.maxWidth, height: pageLayout.totalHeight }}
            >
              {virtualizedPages.map((targetPage) => {
                const pageLayoutItem = pageLayout.items[targetPage - 1];
                if (!pageLayoutItem) {
                  return null;
                }
                const pageDimensions = pageLayoutItem.dimensions;
                const pageTextReplacements = textReplacementsByPage[targetPage] ?? [];
                const activeDraft =
                  activeTool === "editText" && textEditDraft?.pageNumber === targetPage ? textEditDraft : null;

                return (
                  <div
                    key={targetPage}
                    className="absolute left-0 w-full flex justify-center"
                    style={{ top: pageLayoutItem.top, height: pageLayoutItem.height }}
                  >
                    <div
                      className="relative bg-white shadow-lg"
                      style={{ width: pageLayoutItem.width, height: pageLayoutItem.height }}
                      onMouseDown={() => {
                        if (pageNumber !== targetPage) {
                          setPageNumber(targetPage);
                        }
                      }}
                    >
                      <div
                        onClick={(event) => handlePageLayerClick(event, targetPage)}
                        className="relative origin-top-left"
                        style={{
                          width: pageDimensions.width,
                          height: pageDimensions.height,
                          transform: `scale(${scale})`,
                        }}
                      >
                        <Page
                          pageNumber={targetPage}
                          scale={1}
                          onLoadSuccess={(loadedPage) => {
                            onPageLoadSuccess(targetPage, loadedPage as { width: number; height: number });
                          }}
                          renderTextLayer={activeTool === "editText"}
                          renderAnnotationLayer={false}
                        />

                        {pageTextReplacements.length > 0 ? (
                          <div
                            className="absolute inset-0 z-10 pointer-events-none"
                            style={{ width: pageDimensions.width, height: pageDimensions.height }}
                          >
                            {pageTextReplacements.map((item, replacementIndex) => (
                              <div
                                key={item.id ?? item.sourceKey ?? `${item.x}-${item.y}-${replacementIndex}`}
                                className="absolute overflow-hidden whitespace-pre bg-white"
                                style={{
                                  left: item.x,
                                  top: item.y,
                                  width: item.width,
                                  minHeight: item.height,
                                  fontSize: item.fontSize,
                                  fontFamily: item.fontFamily || "Arial",
                                  fontWeight: item.fontWeight || "400",
                                  fontStyle: item.fontStyle || "normal",
                                  color: item.color || "#111827",
                                  lineHeight: 1.2,
                                }}
                              >
                                {item.text}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div
                          className="absolute inset-0 z-20"
                          style={{ width: pageDimensions.width, height: pageDimensions.height }}
                        >
                          <PDFAnnotationCanvas
                            key={targetPage}
                            width={pageDimensions.width}
                            height={pageDimensions.height}
                            activeTool={activeTool}
                            activeColor={activeColor}
                            strokeWidth={strokeWidth}
                            initialAnnotationsJson={normalizeAnnotationJson(annotations[targetPage])}
                            disablePointerEvents={activeTool === "editText"}
                            onAnnotationsChange={(annotationJson) => handleAnnotationsChange(targetPage, annotationJson)}
                          />
                        </div>
                        {activeDraft ? (
                          <div
                            data-text-edit-input="true"
                            className="absolute z-30"
                            style={{
                              left: activeDraft.x,
                              top: activeDraft.y,
                              width: activeDraft.width,
                              minHeight: activeDraft.height,
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <input
                              autoFocus
                              value={activeDraft.value}
                              onChange={(event) =>
                                setTextEditDraft((prev) => (prev ? { ...prev, value: event.target.value } : prev))
                              }
                              onBlur={(event) => {
                                if (skipTextCommitOnBlurRef.current) {
                                  skipTextCommitOnBlurRef.current = false;
                                  return;
                                }
                                commitTextEdit(event.currentTarget.value);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                  return;
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelTextEdit();
                                  event.currentTarget.blur();
                                }
                              }}
                              className="w-full h-full rounded border border-[color:var(--brand-line)] bg-white/95 px-1 text-[color:var(--brand-ink)] shadow-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-purple)]"
                              style={{
                                fontSize: activeDraft.fontSize,
                                fontFamily: activeDraft.fontFamily,
                                fontWeight: activeDraft.fontWeight,
                                fontStyle: activeDraft.fontStyle,
                                color: activeDraft.color,
                                lineHeight: 1.2,
                              }}
                              aria-label={t("toolEditText", "Edit Text")}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Document>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--brand-cream)] border-t border-[color:var(--brand-line)] text-sm text-[color:var(--brand-muted)]">
          <div className="flex items-center gap-4">
            <span>
              {t("toolLabel", "Tool")}:{" "}
              <span className="font-medium text-[color:var(--brand-ink)]">{activeToolLabel}</span>
            </span>
            <span>
              {t("colorLabel", "Color")}:
              <span className="inline-block w-3 h-3 rounded-full align-middle ml-1" style={{ backgroundColor: activeColor }} />
            </span>
          </div>
          <div>
            {exporting ? (
              <span className="text-[color:var(--brand-purple)]">{exportProgressText}</span>
            ) : changedPageCount > 0 ? (
              <span className="text-green-600">
                {t(
                  annotatedPageCount > 0 && textEditedPageCount > 0
                    ? "changesOnPages"
                    : textEditedPageCount > 0
                      ? "textEditsOnPages"
                      : "annotationsOnPages",
                  annotatedPageCount > 0 && textEditedPageCount > 0
                    ? "Changes on {count} page(s)"
                    : textEditedPageCount > 0
                      ? "Text edits on {count} page(s)"
                      : "Annotations on {count} page(s)"
                ).replace(
                  "{count}",
                  `${changedPageCount}`
                )}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
