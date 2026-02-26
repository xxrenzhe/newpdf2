"use client";

import JSZip from "jszip";
import { getClientAuthStatus } from "@/lib/clientAuthState";
import { consumeGuestDownload, getGuestQuotaState } from "@/lib/guestQuota";
import { decryptPdfBytes, encryptPdfBytes } from "./qpdf";

export type PdfCompressPreset = "balanced" | "small" | "smallest";
export type PdfRasterPreset = PdfCompressPreset;
export type PdfProgressCallback = (current: number, total: number) => void;

type PdfLibModule = typeof import("pdf-lib");
type FabricModule = typeof import("fabric");
type PdfTaskOptions = {
  onProgress?: PdfProgressCallback;
};

let pdfLibPromise: Promise<PdfLibModule> | null = null;
let fabricPromise: Promise<FabricModule> | null = null;
let mergeJobId = 0;
let rasterJobId = 0;

function nextMergeJobId() {
  mergeJobId += 1;
  return mergeJobId;
}

function nextRasterJobId() {
  rasterJobId += 1;
  return rasterJobId;
}

async function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import("pdf-lib");
  }
  return pdfLibPromise;
}

async function loadFabric() {
  if (!fabricPromise) {
    fabricPromise = import("fabric");
  }
  return fabricPromise;
}

type MergeWorkerInput = {
  type: "merge";
  jobId: number;
  files: { name: string; bytes: ArrayBuffer }[];
};

type MergeWorkerProgress = {
  type: "merge-progress";
  jobId: number;
  current: number;
  total: number;
};

type MergeWorkerResult = {
  type: "merge-result";
  jobId: number;
  bytes: ArrayBuffer;
};

type MergeWorkerError = {
  type: "merge-error";
  jobId: number;
  message: string;
};

type RasterWorkerTaskInput =
  | {
      type: "compress";
      jobId: number;
      data: ArrayBuffer;
      preset: PdfCompressPreset;
    }
  | {
      type: "redact";
      jobId: number;
      data: ArrayBuffer;
      preset: PdfRasterPreset;
      overlays: Record<number, string>;
    };

type RasterWorkerProgress = {
  type: "raster-progress";
  jobId: number;
  current: number;
  total: number;
};

type RasterWorkerResult = {
  type: "raster-result";
  jobId: number;
  bytes: ArrayBuffer;
};

type RasterWorkerError = {
  type: "raster-error";
  jobId: number;
  message: string;
};

function isMergeWorkerProgress(value: unknown): value is MergeWorkerProgress {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    data.type === "merge-progress" &&
    typeof data.jobId === "number" &&
    typeof data.current === "number" &&
    typeof data.total === "number"
  );
}

function isMergeWorkerResult(value: unknown): value is MergeWorkerResult {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.type === "merge-result" && typeof data.jobId === "number" && data.bytes instanceof ArrayBuffer;
}

function isMergeWorkerError(value: unknown): value is MergeWorkerError {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.type === "merge-error" && typeof data.jobId === "number" && typeof data.message === "string";
}

function isRasterWorkerProgress(value: unknown): value is RasterWorkerProgress {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    data.type === "raster-progress" &&
    typeof data.jobId === "number" &&
    typeof data.current === "number" &&
    typeof data.total === "number"
  );
}

function isRasterWorkerResult(value: unknown): value is RasterWorkerResult {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.type === "raster-result" && typeof data.jobId === "number" && data.bytes instanceof ArrayBuffer;
}

function isRasterWorkerError(value: unknown): value is RasterWorkerError {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.type === "raster-error" && typeof data.jobId === "number" && typeof data.message === "string";
}

function isRasterWorkerManuallyDisabled() {
  if (typeof window === "undefined") return false;
  const runtime = window as Window & { __QWERPDF_DISABLE_RASTER_WORKER__?: boolean };
  if (runtime.__QWERPDF_DISABLE_RASTER_WORKER__ === true) return true;
  try {
    return window.localStorage.getItem("qwerpdf:disable-raster-worker") === "1";
  } catch {
    return false;
  }
}

function supportsRasterWorker() {
  if (isRasterWorkerManuallyDisabled()) return false;
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

async function mergePdfsOnMainThread(files: File[], opts?: PdfTaskOptions) {
  const { PDFDocument } = await loadPdfLib();
  const merged = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of copiedPages) merged.addPage(page);
    opts?.onProgress?.(i + 1, files.length);
  }

  return merged.save();
}

async function mergePdfsWithWorker(files: File[], opts?: PdfTaskOptions): Promise<Uint8Array> {
  if (typeof Worker === "undefined") {
    return mergePdfsOnMainThread(files, opts);
  }

  const worker = new Worker(new URL("./merge.worker.ts", import.meta.url), {
    type: "module",
    name: "pdf-merge-worker",
  });
  const jobId = nextMergeJobId();

  try {
    const payloadFiles = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        bytes: await file.arrayBuffer(),
      }))
    );

    const payload: MergeWorkerInput = {
      type: "merge",
      jobId,
      files: payloadFiles,
    };
    const transferables = payloadFiles.map((item) => item.bytes);

    return await new Promise<Uint8Array>((resolve, reject) => {
      const cleanup = () => {
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
      };

      worker.onmessage = (evt: MessageEvent<unknown>) => {
        if (isMergeWorkerProgress(evt.data)) {
          if (evt.data.jobId !== jobId) return;
          opts?.onProgress?.(evt.data.current, evt.data.total);
          return;
        }
        if (isMergeWorkerResult(evt.data)) {
          if (evt.data.jobId !== jobId) return;
          cleanup();
          resolve(new Uint8Array(evt.data.bytes));
          return;
        }
        if (isMergeWorkerError(evt.data)) {
          if (evt.data.jobId !== jobId) return;
          cleanup();
          reject(new Error(evt.data.message || "Failed to merge PDFs in worker"));
        }
      };

      worker.onerror = () => {
        cleanup();
        reject(new Error("Failed to initialize PDF merge worker"));
      };

      worker.postMessage(payload, transferables);
    });
  } catch {
    worker.terminate();
    return mergePdfsOnMainThread(files, opts);
  }
}

async function runRasterWorkerTask(task: RasterWorkerTaskInput, opts?: PdfTaskOptions): Promise<Uint8Array> {
  if (!supportsRasterWorker()) {
    throw new Error("Raster worker not supported");
  }

  const worker = new Worker(new URL("./raster.worker.ts", import.meta.url), {
    type: "module",
    name: "pdf-raster-worker",
  });

  return await new Promise<Uint8Array>((resolve, reject) => {
    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    worker.onmessage = (evt: MessageEvent<unknown>) => {
      if (isRasterWorkerProgress(evt.data)) {
        if (evt.data.jobId !== task.jobId) return;
        opts?.onProgress?.(evt.data.current, evt.data.total);
        return;
      }
      if (isRasterWorkerResult(evt.data)) {
        if (evt.data.jobId !== task.jobId) return;
        cleanup();
        resolve(new Uint8Array(evt.data.bytes));
        return;
      }
      if (isRasterWorkerError(evt.data)) {
        if (evt.data.jobId !== task.jobId) return;
        cleanup();
        reject(new Error(evt.data.message || "Raster worker task failed"));
      }
    };

    worker.onerror = () => {
      cleanup();
      reject(new Error("Failed to initialize raster worker"));
    };

    worker.postMessage(task, [task.data]);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const authed = getClientAuthStatus();
  if (authed === false) {
    const quota = getGuestQuotaState();
    if (quota.remaining <= 0) {
      window.alert("Guest daily download limit reached. Continue with Google to download more.");
      return;
    }
    consumeGuestDownload(1);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const [, base64] = dataUrl.split(",", 2);
  if (!base64) return new Uint8Array();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function canvasToUint8Array(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => {
    if (!("toBlob" in canvas)) {
      resolve(null);
      return;
    }
    canvas.toBlob(resolve, type, quality);
  });
  if (blob) return new Uint8Array(await blob.arrayBuffer());
  return dataUrlToUint8Array(canvas.toDataURL(type, quality));
}

export async function mergePdfs(files: File[], opts: PdfTaskOptions = {}): Promise<Uint8Array> {
  if (files.length <= 1) {
    return mergePdfsOnMainThread(files, opts);
  }
  try {
    return await mergePdfsWithWorker(files, opts);
  } catch {
    return mergePdfsOnMainThread(files, opts);
  }
}

export async function splitPdfToZip(file: File, pageNumbers1Based?: number[]): Promise<Blob> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const zip = new JSZip();

  const pageNumbers =
    pageNumbers1Based && pageNumbers1Based.length > 0
      ? pageNumbers1Based
      : Array.from({ length: source.getPageCount() }, (_, i) => i + 1);

  for (const n of pageNumbers) {
    const idx = n - 1;
    if (idx < 0 || idx >= source.getPageCount()) continue;
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(source, [idx]);
    out.addPage(page);
    const outBytes = await out.save();
    zip.file(`${n}.pdf`, outBytes);
  }

  return zip.generateAsync({ type: "blob" });
}

export async function extractPdfPages(file: File, pageNumbers1Based: number[]): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const indices = pageNumbers1Based
    .map((n) => n - 1)
    .filter((n) => Number.isInteger(n) && n >= 0 && n < source.getPageCount());

  const pages = await out.copyPages(source, indices);
  for (const page of pages) out.addPage(page);
  return out.save();
}

export type PageOpItem = {
  sourcePageIndex: number; // 0-based
  rotationDegrees: number; // 0/90/180/270
};

export async function rebuildPdfWithOps(file: File, items: PageOpItem[]): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();

  const max = source.getPageCount();
  for (const item of items) {
    if (!Number.isInteger(item.sourcePageIndex)) continue;
    if (item.sourcePageIndex < 0 || item.sourcePageIndex >= max) continue;

    const [page] = await out.copyPages(source, [item.sourcePageIndex]);
    const added = out.addPage(page);
    const rot = ((item.rotationDegrees % 360) + 360) % 360;
    if (rot !== 0) {
      added.setRotation(degrees(rot));
    }
  }

  return out.save();
}

export async function addTextWatermark(
  file: File,
  opts: { text: string; opacity: number; fontSize: number; rotationDegrees: number }
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, degrees, rgb } = await loadPdfLib();
  if (!opts.text) throw new Error("Watermark text is required");
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);

  const opacity = Math.max(0, Math.min(1, opts.opacity));
  const fontSize = Math.max(8, Math.min(160, opts.fontSize));
  const rotationDegrees = Number.isFinite(opts.rotationDegrees) ? opts.rotationDegrees : 0;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const textWidth = font.widthOfTextAtSize(opts.text, fontSize);
    const x = (width - textWidth) / 2;
    const y = height / 2;

    page.drawText(opts.text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.55, 0.55, 0.55),
      opacity,
      rotate: degrees(rotationDegrees),
    });
  }

  return pdf.save();
}

export async function cropPdf(
  file: File,
  opts: { marginLeft: number; marginRight: number; marginTop: number; marginBottom: number }
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const left = Math.max(0, opts.marginLeft);
    const right = Math.max(0, opts.marginRight);
    const top = Math.max(0, opts.marginTop);
    const bottom = Math.max(0, opts.marginBottom);

    const newWidth = Math.max(1, width - left - right);
    const newHeight = Math.max(1, height - top - bottom);

    page.setCropBox(left, bottom, newWidth, newHeight);
  }

  return pdf.save();
}

export async function imagesToPdf(images: File[]): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const pdf = await PDFDocument.create();

  for (const img of images) {
    const bytes = new Uint8Array(await img.arrayBuffer());
    const isPng = img.type === "image/png" || img.name.toLowerCase().endsWith(".png");
    const embedded = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const { width, height } = embedded.scale(1);
    const page = pdf.addPage([width, height]);
    page.drawImage(embedded, { x: 0, y: 0, width, height });
  }

  return pdf.save();
}

export async function pdfToImagesZip(
  file: File,
  opts: { format: "png" | "jpg"; quality?: number; dpi: number }
): Promise<Blob> {
  const { configurePdfJsWorkerV2, pdfjs } = await import("./pdfjsV2");
  configurePdfJsWorkerV2();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const zip = new JSZip();

  const scale = opts.dpi / 72;
  const quality = opts.quality ?? 0.85;
  const ext = opts.format === "jpg" ? "jpg" : "png";
  const mime = opts.format === "jpg" ? "image/jpeg" : "image/png";

  const canvas = document.createElement("canvas");

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    const bytes = await canvasToUint8Array(canvas, mime, quality);
    zip.file(`${pageNum}.${ext}`, bytes);
    (page as { cleanup?: () => void }).cleanup?.();
  }

  return zip.generateAsync({ type: "blob" });
}

export async function extractPdfText(file: File): Promise<string> {
  const { configurePdfJsWorkerV2, pdfjs } = await import("./pdfjsV2");
  configurePdfJsWorkerV2();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .filter(Boolean);
    parts.push(strings.join(" "));
  }
  return parts.join("\n\n");
}

async function compressPdfRasterizeOnMainThread(
  file: File,
  preset: PdfCompressPreset,
  opts: PdfTaskOptions = {}
): Promise<Uint8Array> {
  const presets: Record<PdfCompressPreset, { dpi: number; quality: number }> = {
    balanced: { dpi: 150, quality: 0.8 },
    small: { dpi: 120, quality: 0.65 },
    smallest: { dpi: 96, quality: 0.5 },
  };

  const { dpi, quality } = presets[preset];
  const { configurePdfJsWorkerV2, pdfjs } = await import("./pdfjsV2");
  const { PDFDocument } = await loadPdfLib();
  configurePdfJsWorkerV2();

  const data = new Uint8Array(await file.arrayBuffer());
  const input = await pdfjs.getDocument({ data }).promise;
  const output = await PDFDocument.create();

  const renderScale = dpi / 72;

  for (let pageNum = 1; pageNum <= input.numPages; pageNum++) {
    const page = await input.getPage(pageNum);
    const viewport1 = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    const jpgBytes = await canvasToUint8Array(canvas, "image/jpeg", quality);
    const embedded = await output.embedJpg(jpgBytes);

    const outPage = output.addPage([viewport1.width, viewport1.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: viewport1.width,
      height: viewport1.height,
    });
    (page as { cleanup?: () => void }).cleanup?.();
    opts.onProgress?.(pageNum, input.numPages);
  }

  return output.save();
}

export async function compressPdfRasterize(
  file: File,
  preset: PdfCompressPreset,
  opts: PdfTaskOptions = {}
): Promise<Uint8Array> {
  if (supportsRasterWorker()) {
    try {
      const data = await file.arrayBuffer();
      return await runRasterWorkerTask(
        {
          type: "compress",
          jobId: nextRasterJobId(),
          data,
          preset,
        },
        opts
      );
    } catch {
      // Fall through to main-thread implementation.
    }
  }
  return compressPdfRasterizeOnMainThread(file, preset, opts);
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  return canvas;
}

async function renderFabricJsonToCanvasElement(json: string, size: { width: number; height: number }) {
  const fabric = await loadFabric();
  const canvasEl = createCanvas(size.width, size.height);
  const canvas = new fabric.StaticCanvas(canvasEl, { width: size.width, height: size.height });

  const loadResult = (canvas as unknown as { loadFromJSON: (json: string, cb?: () => void) => unknown }).loadFromJSON(
    json,
    () => {}
  );
  if (loadResult instanceof Promise) {
    await loadResult;
  } else {
    await new Promise<void>((resolve) => {
      (canvas as unknown as { loadFromJSON: (json: string, cb: () => void) => void }).loadFromJSON(json, () => resolve());
    });
  }

  canvas.renderAll();
  canvas.dispose();
  return canvasEl;
}

async function redactPdfRasterizeOnMainThread(
  file: File,
  overlays: Record<number, string>,
  preset: PdfRasterPreset,
  opts: PdfTaskOptions = {}
): Promise<Uint8Array> {
  const presets: Record<PdfRasterPreset, { dpi: number; quality: number }> = {
    balanced: { dpi: 150, quality: 0.85 },
    small: { dpi: 120, quality: 0.75 },
    smallest: { dpi: 96, quality: 0.65 },
  };
  const { dpi, quality } = presets[preset];

  const data = new Uint8Array(await file.arrayBuffer());
  const hasRedactions = Object.keys(overlays).length > 0;
  if (!hasRedactions) return data;

  const { configurePdfJsWorkerV2, pdfjs } = await import("./pdfjsV2");
  const { PDFDocument } = await loadPdfLib();
  configurePdfJsWorkerV2();
  const input = await pdfjs.getDocument({ data }).promise;
  const source = await PDFDocument.load(data);
  const output = await PDFDocument.create();

  const renderScale = dpi / 72;

  const totalPages = Math.min(input.numPages, source.getPageCount());

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const overlayJson = overlays[pageNum];
    if (!overlayJson) {
      const [copied] = await output.copyPages(source, [pageNum - 1]);
      output.addPage(copied);
      opts.onProgress?.(pageNum, totalPages);
      continue;
    }

    const page = await input.getPage(pageNum);
    const viewport1 = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: renderScale });

    const baseCanvas = createCanvas(viewport.width, viewport.height);
    const ctx = baseCanvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: ctx, canvas: baseCanvas, viewport }).promise;

    const overlayCanvas = await renderFabricJsonToCanvasElement(overlayJson, {
      width: viewport1.width,
      height: viewport1.height,
    });
    ctx.drawImage(overlayCanvas, 0, 0, baseCanvas.width, baseCanvas.height);

    const jpgBytes = await canvasToUint8Array(baseCanvas, "image/jpeg", quality);
    const embedded = await output.embedJpg(jpgBytes);

    const outPage = output.addPage([viewport1.width, viewport1.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: viewport1.width,
      height: viewport1.height,
    });
    (page as { cleanup?: () => void }).cleanup?.();
    opts.onProgress?.(pageNum, totalPages);
  }

  return output.save();
}

export async function redactPdfRasterize(
  file: File,
  overlays: Record<number, string>,
  preset: PdfRasterPreset,
  opts: PdfTaskOptions = {}
): Promise<Uint8Array> {
  const hasRedactions = Object.keys(overlays).length > 0;
  if (!hasRedactions) {
    return new Uint8Array(await file.arrayBuffer());
  }

  if (supportsRasterWorker()) {
    try {
      const data = await file.arrayBuffer();
      return await runRasterWorkerTask(
        {
          type: "redact",
          jobId: nextRasterJobId(),
          data,
          preset,
          overlays,
        },
        opts
      );
    } catch {
      // Fall through to main-thread implementation.
    }
  }

  return redactPdfRasterizeOnMainThread(file, overlays, preset, opts);
}

export async function signPdfWithPng(
  file: File,
  signaturePng: Uint8Array,
  opts: { pageNumber1Based: number; width: number; marginRight: number; marginBottom: number }
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const pageIndex = Math.min(Math.max(opts.pageNumber1Based - 1, 0), pdf.getPageCount() - 1);
  const page = pdf.getPage(pageIndex);

  const png = await pdf.embedPng(signaturePng);
  const pngDims = png.scale(1);

  const targetWidth = opts.width;
  const targetHeight = (pngDims.height / pngDims.width) * targetWidth;

  const x = Math.max(0, page.getWidth() - opts.marginRight - targetWidth);
  const y = Math.max(0, opts.marginBottom);

  page.drawImage(png, { x, y, width: targetWidth, height: targetHeight });
  return pdf.save();
}

export async function renderFabricJsonToPngDataUrl(
  json: string,
  size: { width: number; height: number }
): Promise<string> {
  const fabric = await loadFabric();
  const canvasEl = createCanvas(size.width, size.height);
  const canvas = new fabric.StaticCanvas(canvasEl, { width: size.width, height: size.height });

  const loadResult = (canvas as unknown as { loadFromJSON: (json: string, cb?: () => void) => unknown }).loadFromJSON(json, () => {});
  if (loadResult instanceof Promise) {
    await loadResult;
  } else {
    await new Promise<void>((resolve) => {
      (canvas as unknown as { loadFromJSON: (json: string, cb: () => void) => void }).loadFromJSON(json, () => resolve());
    });
  }

  canvas.renderAll();
  const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
  canvas.dispose();
  return dataUrl;
}

export async function renderFabricJsonToPngBytes(
  json: string,
  size: { width: number; height: number }
): Promise<Uint8Array> {
  const fabric = await loadFabric();
  const canvasEl = createCanvas(size.width, size.height);
  const canvas = new fabric.StaticCanvas(canvasEl, { width: size.width, height: size.height });

  const loadResult = (canvas as unknown as { loadFromJSON: (json: string, cb?: () => void) => unknown }).loadFromJSON(
    json,
    () => {}
  );
  if (loadResult instanceof Promise) {
    await loadResult;
  } else {
    await new Promise<void>((resolve) => {
      (canvas as unknown as { loadFromJSON: (json: string, cb: () => void) => void }).loadFromJSON(json, () => resolve());
    });
  }

  canvas.renderAll();
  const bytes = await canvasToUint8Array(canvasEl, "image/png");
  canvas.dispose();
  return bytes;
}

export async function applyAnnotationOverlays(
  file: File,
  overlays: Record<number, string>,
  pageSize: { width: number; height: number }
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const pdfBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(pdfBytes);

  for (const [pageNumStr, json] of Object.entries(overlays)) {
    const pageNumber1Based = Number(pageNumStr);
    if (!json) continue;
    if (!Number.isFinite(pageNumber1Based)) continue;
    const pageIndex = pageNumber1Based - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) continue;

    const pngBytes = await renderFabricJsonToPngBytes(json, pageSize);
    const png = await pdf.embedPng(pngBytes);
    const page = pdf.getPage(pageIndex);
    page.drawImage(png, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }

  return pdf.save();
}

export async function protectPdfWithPassword(file: File, password: string): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return encryptPdfBytes(bytes, password);
}

export async function unlockPdfWithPassword(file: File, password: string): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return decryptPdfBytes(bytes, password);
}
