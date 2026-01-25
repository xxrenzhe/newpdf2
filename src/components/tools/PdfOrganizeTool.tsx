"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FileDropzone from "./FileDropzone";
import type { PageOpItem } from "@/lib/pdf/client";
import { downloadBlob, rebuildPdfWithOps } from "@/lib/pdf/client";
import { configurePdfJsWorker, pdfjs } from "@/lib/pdf/pdfjs";
import { safeRandomUUID } from "@/lib/safeRandomUUID";
import { useLanguage } from "@/components/LanguageProvider";

type PageItem = {
  id: string;
  sourcePageIndex: number; // 0-based
  rotationDegrees: number; // 0/90/180/270
};

type ThumbEntry = {
  url: string;
  width: number;
  height: number;
};
type ThumbState = Record<number, ThumbEntry>;

function clampRotation(deg: number) {
  const v = ((deg % 360) + 360) % 360;
  if (v === 90 || v === 180 || v === 270) return v;
  return 0;
}

export default function PdfOrganizeTool({ initialFile }: { initialFile?: File }) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PageItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [thumbs, setThumbs] = useState<ThumbState>({});
  const { t } = useLanguage();
  const [numPages, setNumPages] = useState(0);

  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const thumbsRef = useRef<ThumbState>({});
  const renderChainRef = useRef(Promise.resolve());
  const createdObjectUrlsRef = useRef<string[]>([]);
  const renderSessionRef = useRef(0);

  useEffect(() => {
    thumbsRef.current = thumbs;
  }, [thumbs]);

  const isPdf = useMemo(
    () => !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")),
    [file]
  );

  const selectedIds = useMemo(() => new Set(Object.entries(selected).filter(([, v]) => v).map(([k]) => k)), [selected]);
  const selectedCount = selectedIds.size;

  const resetFileState = useCallback(() => {
    renderSessionRef.current += 1;

    const doc = docRef.current;
    docRef.current = null;
    void (doc as { destroy?: () => Promise<void> | void } | null)?.destroy?.();

    setError("");
    setThumbs({});
    thumbsRef.current = {};
    setNumPages(0);
    setItems([]);
    setSelected({});

    for (const url of createdObjectUrlsRef.current) URL.revokeObjectURL(url);
    createdObjectUrlsRef.current = [];

    renderChainRef.current = Promise.resolve();
  }, []);

  useEffect(() => {
    if (!file || !isPdf) return;
    configurePdfJsWorker();
    let cancelled = false;

    const run = async () => {
      resetFileState();
      const data = new Uint8Array(await file.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      if (cancelled) {
        void (doc as { destroy?: () => Promise<void> | void }).destroy?.();
        return;
      }
      docRef.current = doc;
      setNumPages(doc.numPages);

      setItems(
        Array.from({ length: doc.numPages }, (_, i) => ({
          id: safeRandomUUID(),
          sourcePageIndex: i,
          rotationDegrees: 0,
        }))
      );
      setSelected({});
    };

    void run().catch((e) => setError(e instanceof Error ? e.message : t("loadPdfFailed", "Failed to load PDF")));
    return () => {
      cancelled = true;
    };
  }, [file, isPdf, resetFileState, t]);

  useEffect(() => {
    return () => {
      renderSessionRef.current += 1;
      const doc = docRef.current;
      docRef.current = null;
      void (doc as { destroy?: () => Promise<void> | void } | null)?.destroy?.();
      for (const url of createdObjectUrlsRef.current) URL.revokeObjectURL(url);
      createdObjectUrlsRef.current = [];
    };
  }, []);

  const renderThumb = useCallback(async (pageIndex: number) => {
    const session = renderSessionRef.current;
    if (!docRef.current) return;
    if (thumbsRef.current[pageIndex]) return;

    renderChainRef.current = renderChainRef.current.then(async () => {
      if (session !== renderSessionRef.current) return;
      if (thumbsRef.current[pageIndex]) return;

      const doc = docRef.current;
      if (!doc) return;

      try {
        const page = await doc.getPage(pageIndex + 1);
        if (session !== renderSessionRef.current) return;

        const targetWidth = 240;
        const viewport0 = page.getViewport({ scale: 1 });
        const scale = targetWidth / Math.max(1, viewport0.width);
        const viewport = page.getViewport({ scale });

        const thumbWidth = Math.ceil(viewport.width);
        const thumbHeight = Math.ceil(viewport.height);
        const canvas = document.createElement("canvas");
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        await page.render({ canvasContext: ctx, canvas, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.8)
        );
        const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/jpeg", 0.8);
        if (blob) createdObjectUrlsRef.current.push(url);

        if (session !== renderSessionRef.current) {
          if (blob) URL.revokeObjectURL(url);
          return;
        }

        setThumbs((prev) => ({ ...prev, [pageIndex]: { url, width: thumbWidth, height: thumbHeight } }));
        (page as { cleanup?: () => void }).cleanup?.();
      } catch {
        // ignore
      }
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectAll = useCallback(() => {
    setSelected(Object.fromEntries(items.map((i) => [i.id, true])));
  }, [items]);

  const clearSelection = useCallback(() => setSelected({}), []);

  const move = useCallback((id: string, delta: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  }, []);

  const rotateIds = useCallback((ids: Set<string>, delta: number) => {
    if (ids.size === 0) return;
    setItems((prev) =>
      prev.map((p) =>
        ids.has(p.id)
          ? { ...p, rotationDegrees: clampRotation(p.rotationDegrees + delta) }
          : p
      )
    );
  }, []);

  const deleteIds = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return;
    setItems((prev) => prev.filter((p) => !ids.has(p.id)));
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  }, []);

  const exportPdf = useCallback(
    async (onlySelected: boolean) => {
      if (!file || !isPdf) return;
      setBusy(true);
      setError("");
      try {
        const list = onlySelected ? items.filter((i) => selectedIds.has(i.id)) : items;
        if (list.length === 0) throw new Error(t("noPagesSelected", "No pages selected."));
        const ops: PageOpItem[] = list.map((i) => ({
          sourcePageIndex: i.sourcePageIndex,
          rotationDegrees: i.rotationDegrees,
        }));
        const bytes = await rebuildPdfWithOps(file, ops);
        const suffix = onlySelected ? "-selected" : "-organized";
        const outName = file.name.replace(/\.[^.]+$/, "") + `${suffix}.pdf`;
        downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), outName);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("exportFailed", "Export failed"));
      } finally {
        setBusy(false);
      }
    },
    [file, isPdf, items, selectedIds, t]
  );

  if (!file) {
    return (
      <FileDropzone
        accept=".pdf,application/pdf"
        onFiles={(files) => setFile(files[0] ?? null)}
        title={t("dropPdfToOrganize", "Drop a PDF here to organize pages")}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-6 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[color:var(--brand-ink)]">
              {t("organizePagesTitle", "Organize Pages")}
            </h3>
            <p className="text-sm text-[color:var(--brand-muted)] truncate">
              {file.name}
              {numPages ? ` | ${t("pageCount", "{count} pages").replace("{count}", `${numPages}`)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
              onClick={() => {
                resetFileState();
                setFile(null);
              }}
            >
              {t("changeFile", "Change file")}
            </button>
            <button
              type="button"
              disabled={items.length === 0 || busy}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50"
              onClick={() => void exportPdf(false)}
            >
              {busy ? t("working", "Working…") : t("exportPdf", "Export PDF")}
            </button>
          </div>
        </div>

        {!isPdf && (
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

      <div className="bg-white rounded-2xl border border-[color:var(--brand-line)] shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
              onClick={selectAll}
              disabled={items.length === 0}
            >
              {t("selectAll", "Select all")}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
              onClick={clearSelection}
              disabled={selectedCount === 0}
            >
              {t("clear", "Clear")}
            </button>
            <span className="text-sm text-[color:var(--brand-muted)]">
              {selectedCount > 0
                ? t("selectedCount", "{count} selected").replace("{count}", `${selectedCount}`)
                : t("pageCount", "{count} pages").replace("{count}", `${items.length}`)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
              onClick={() => rotateIds(selectedIds, -90)}
              disabled={selectedCount === 0}
              title={t("rotateLeft", "Rotate left")}
            >
              {t("rotateLeftLabel", "Rotate ⟲")}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
              onClick={() => rotateIds(selectedIds, 90)}
              disabled={selectedCount === 0}
              title={t("rotateRight", "Rotate right")}
            >
              {t("rotateRightLabel", "Rotate ⟳")}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
              onClick={() => deleteIds(selectedIds)}
              disabled={selectedCount === 0}
              title={t("deleteSelectedPages", "Delete selected pages")}
            >
              {t("delete", "Delete")}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-primary hover:bg-[color:var(--brand-purple-dark)] text-white font-medium disabled:opacity-50"
              onClick={() => void exportPdf(true)}
              disabled={selectedCount === 0 || busy}
            >
              {t("exportSelected", "Export selected")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item, idx) => {
            const thumb = thumbs[item.sourcePageIndex];
            const isSelected = !!selected[item.id];
            return (
              <OrganizePageCard
                key={item.id}
                idx={idx}
                total={items.length}
                item={item}
                thumb={thumb}
                selected={isSelected}
                t={t}
                onToggleSelect={() => toggleSelect(item.id)}
                onMoveUp={() => move(item.id, -1)}
                onMoveDown={() => move(item.id, 1)}
                onRotate={() => rotateIds(new Set([item.id]), 90)}
                onNeedThumb={() => void renderThumb(item.sourcePageIndex)}
                disableMoveUp={idx === 0}
                disableMoveDown={idx === items.length - 1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrganizePageCard({
  idx,
  total,
  item,
  thumb,
  selected,
  t,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  onRotate,
  onNeedThumb,
  disableMoveUp,
  disableMoveDown,
}: {
  idx: number;
  total: number;
  item: PageItem;
  thumb?: ThumbEntry;
  selected: boolean;
  t: (key: string, fallback?: string) => string;
  onToggleSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRotate: () => void;
  onNeedThumb: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el || thumb) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          onNeedThumb();
          observer.disconnect();
          return;
        }
      },
      { root: null, rootMargin: "900px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onNeedThumb, thumb]);

  return (
    <div className={`rounded-xl border ${selected ? "border-primary" : "border-[color:var(--brand-line)]"} overflow-hidden`}>
      <button
        ref={buttonRef}
        type="button"
        className="w-full text-left"
        onClick={onToggleSelect}
        title={t("select", "Select")}
      >
        <div className="bg-[color:var(--brand-cream)] p-2 flex items-center justify-between">
          <span className="text-xs text-[color:var(--brand-muted)]">
            {idx + 1} / {total}
          </span>
          <span className="text-xs text-[color:var(--brand-muted)]">
            {t("pageShort", "p{count}").replace("{count}", `${item.sourcePageIndex + 1}`)}
            {item.rotationDegrees ? ` · ${item.rotationDegrees}°` : ""}
          </span>
        </div>
        <div className="bg-white p-2">
          {thumb ? (
            <img
              src={thumb.url}
              alt=""
              width={thumb.width}
              height={thumb.height}
              loading="lazy"
              className="w-full rounded-lg border border-[color:var(--brand-line)]"
            />
          ) : (
            <div className="w-full aspect-[3/4] rounded-lg bg-[color:var(--brand-cream)]" />
          )}
        </div>
      </button>

      <div className="flex items-center justify-between gap-1 px-2 pb-2">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={disableMoveUp}
          aria-label={t("moveUp", "Move up")}
          className="flex-1 h-9 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
          title={t("moveUp", "Move up")}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={disableMoveDown}
          aria-label={t("moveDown", "Move down")}
          className="flex-1 h-9 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)] disabled:opacity-50"
          title={t("moveDown", "Move down")}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRotate}
          aria-label={t("rotate", "Rotate")}
          className="flex-1 h-9 rounded-lg border border-[color:var(--brand-line)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-cream)]"
          title={t("rotate", "Rotate")}
        >
          ⟳
        </button>
      </div>
    </div>
  );
}
