"use client";

import JSZip from "jszip";
import { getClientAuthStatus } from "@/lib/clientAuthState";
import { consumeGuestDownload, getGuestQuotaState } from "@/lib/guestQuota";
import { decryptPdfBytes, encryptPdfBytes } from "./qpdf";

export type PdfCompressPreset = "balanced" | "small" | "smallest";
export type PdfRasterPreset = PdfCompressPreset;
export type PdfProgressCallback = (current: number, total: number) => void;
export type PdfTextReplacementItem = {
  id?: string;
  sourceKey?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
};

type PdfLibModule = typeof import("pdf-lib");
type FabricModule = typeof import("fabric");
type TextFallbackModule = typeof import("./textFallback");
type PdfTaskOptions = {
  onProgress?: PdfProgressCallback;
};

let pdfLibPromise: Promise<PdfLibModule> | null = null;
let fabricPromise: Promise<FabricModule> | null = null;
let textFallbackPromise: Promise<TextFallbackModule> | null = null;
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

async function loadTextFallback() {
  if (!textFallbackPromise) {
    textFallbackPromise = import("./textFallback");
  }
  return textFallbackPromise;
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

type ApplyAnnotationOverlayOptions = {
  onProgress?: PdfProgressCallback;
  yieldEveryPages?: number;
  pageSizesByPage?: Record<number, { width: number; height: number }>;
  textReplacementsByPage?: Record<number, PdfTextReplacementItem[]>;
};

type NormalizedTextReplacementItem = Omit<PdfTextReplacementItem, "sourceKey"> & {
  sourceKey: string;
};

type StandardFontKey =
  | "Helvetica"
  | "HelveticaBold"
  | "HelveticaOblique"
  | "HelveticaBoldOblique"
  | "Courier"
  | "CourierBold"
  | "CourierOblique"
  | "CourierBoldOblique"
  | "TimesRoman"
  | "TimesRomanBold"
  | "TimesRomanItalic"
  | "TimesRomanBoldItalic";

function isValidPageSize(size: { width: number; height: number } | undefined): size is { width: number; height: number } {
  return Boolean(
    size &&
      Number.isFinite(size.width) &&
      Number.isFinite(size.height) &&
      size.width > 0 &&
      size.height > 0
  );
}

function normalizePageNumber(pageNumberLike: string): number | null {
  const pageNumber = Number(pageNumberLike);
  if (!Number.isInteger(pageNumber) || pageNumber <= 0) return null;
  return pageNumber;
}

function normalizeTextReplacementItem(
  item: PdfTextReplacementItem,
  fallbackSourceKey: string
): NormalizedTextReplacementItem | null {
  const text = typeof item.text === "string" ? item.text : "";
  if (text.trim().length === 0) return null;

  const x = Number(item.x);
  const y = Number(item.y);
  const width = Number(item.width);
  const height = Number(item.height);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  if (width <= 0 || height <= 0) return null;

  const fontSizeRaw = Number(item.fontSize);
  const fontSize =
    Number.isFinite(fontSizeRaw) && fontSizeRaw > 0 ? fontSizeRaw : Math.max(8, Math.min(width, height) * 0.8);

  const sourceKey =
    typeof item.sourceKey === "string" && item.sourceKey.trim().length > 0
      ? item.sourceKey
      : fallbackSourceKey;
  const id = typeof item.id === "string" && item.id.trim().length > 0 ? item.id : sourceKey;

  return {
    id,
    sourceKey,
    x,
    y,
    width,
    height,
    text,
    fontSize,
    fontFamily: item.fontFamily,
    fontWeight: item.fontWeight,
    fontStyle: item.fontStyle,
    color: item.color,
  };
}

function normalizeTextReplacementsByPage(
  input: Record<number, PdfTextReplacementItem[]> | undefined
): Map<number, NormalizedTextReplacementItem[]> {
  const result = new Map<number, NormalizedTextReplacementItem[]>();
  if (!input) return result;

  for (const [pageNumStr, items] of Object.entries(input)) {
    const pageNumber1Based = normalizePageNumber(pageNumStr);
    if (!pageNumber1Based || !Array.isArray(items) || items.length === 0) continue;

    const deduped = new Map<string, NormalizedTextReplacementItem>();
    for (let index = 0; index < items.length; index += 1) {
      const normalized = normalizeTextReplacementItem(items[index], `${pageNumber1Based}-${index}`);
      if (!normalized) continue;
      deduped.set(normalized.sourceKey, normalized);
    }

    if (deduped.size > 0) {
      result.set(pageNumber1Based, Array.from(deduped.values()));
    }
  }

  return result;
}

function isBoldFont(fontWeight: string | undefined) {
  if (!fontWeight) return false;
  const normalized = fontWeight.toLowerCase();
  if (normalized.includes("bold")) return true;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed >= 600;
}

function isItalicFont(fontStyle: string | undefined) {
  if (!fontStyle) return false;
  const normalized = fontStyle.toLowerCase();
  return normalized.includes("italic") || normalized.includes("oblique");
}

function resolveStandardFontKey(
  fontFamily: string | undefined,
  fontWeight: string | undefined,
  fontStyle: string | undefined
): StandardFontKey {
  const normalizedFamily = (fontFamily || "").toLowerCase();
  const bold = isBoldFont(fontWeight);
  const italic = isItalicFont(fontStyle);
  const isMono = normalizedFamily.includes("courier") || normalizedFamily.includes("mono");
  const isSerif = normalizedFamily.includes("times") || normalizedFamily.includes("serif");

  if (isMono) {
    if (bold && italic) return "CourierBoldOblique";
    if (bold) return "CourierBold";
    if (italic) return "CourierOblique";
    return "Courier";
  }

  if (isSerif) {
    if (bold && italic) return "TimesRomanBoldItalic";
    if (bold) return "TimesRomanBold";
    if (italic) return "TimesRomanItalic";
    return "TimesRoman";
  }

  if (bold && italic) return "HelveticaBoldOblique";
  if (bold) return "HelveticaBold";
  if (italic) return "HelveticaOblique";
  return "Helvetica";
}

function clampByte(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return Math.round(value);
}

function parseRgbComponent(component: string): number | null {
  const normalized = component.trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  if (normalized.endsWith("%")) {
    return clampByte((parsed / 100) * 255);
  }
  return clampByte(parsed);
}

function parseCssColorToRgb(color: string | undefined): { r: number; g: number; b: number } {
  if (!color) return { r: 0, g: 0, b: 0 };
  const normalized = color.trim().toLowerCase();
  if (!normalized) return { r: 0, g: 0, b: 0 };

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = Number.parseInt(`${hex[0]}${hex[0]}`, 16);
      const g = Number.parseInt(`${hex[1]}${hex[1]}`, 16);
      const b = Number.parseInt(`${hex[2]}${hex[2]}`, 16);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return { r, g, b };
      }
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return { r, g, b };
      }
    }
  }

  const rgbMatch = normalized.match(/^rgba?\((.+)\)$/);
  if (rgbMatch) {
    const rawChannels = rgbMatch[1].split("/")[0]?.trim() || "";
    const parts = rawChannels.includes(",")
      ? rawChannels.split(",").map((part) => part.trim()).filter(Boolean)
      : rawChannels.split(/\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const r = parseRgbComponent(parts[0]);
      const g = parseRgbComponent(parts[1]);
      const b = parseRgbComponent(parts[2]);
      if (r !== null && g !== null && b !== null) {
        return { r, g, b };
      }
    }
  }

  switch (normalized) {
    case "white":
      return { r: 255, g: 255, b: 255 };
    case "red":
      return { r: 255, g: 0, b: 0 };
    case "green":
      return { r: 0, g: 128, b: 0 };
    case "blue":
      return { r: 0, g: 0, b: 255 };
    case "gray":
    case "grey":
      return { r: 128, g: 128, b: 128 };
    default:
      return { r: 0, g: 0, b: 0 };
  }
}

async function drawTextReplacementsOnPage(
  pdf: import("pdf-lib").PDFDocument,
  page: import("pdf-lib").PDFPage,
  replacements: NormalizedTextReplacementItem[],
  overlaySize: { width: number; height: number },
  standardFonts: PdfLibModule["StandardFonts"],
  rgb: PdfLibModule["rgb"],
  fontCache: Map<StandardFontKey, Promise<import("pdf-lib").PDFFont>>,
  fallbackFontCache: Map<string, import("pdf-lib").PDFFont>
) {
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const scaleX = pageWidth / Math.max(overlaySize.width, 0.001);
  const scaleY = pageHeight / Math.max(overlaySize.height, 0.001);

  for (const replacement of replacements) {
    const text = replacement.text.replace(/\r\n/g, "\n");
    if (text.trim().length === 0) continue;

    const mappedX = replacement.x * scaleX;
    const mappedYTop = replacement.y * scaleY;
    const mappedWidth = Math.max(replacement.width * scaleX, 1);
    const mappedHeight = Math.max(replacement.height * scaleY, 1);
    if (![mappedX, mappedYTop, mappedWidth, mappedHeight].every((value) => Number.isFinite(value))) {
      continue;
    }

    if (mappedX >= pageWidth || mappedX + mappedWidth <= 0) continue;
    const fontSize = Math.max(4, replacement.fontSize * scaleY);
    if (!Number.isFinite(fontSize)) continue;

    const lines = text.split("\n");
    const lineHeight = Math.max(fontSize * 1.2, 4);
    const drawHeight = Math.max(mappedHeight, lineHeight * lines.length);
    const rawRectY = pageHeight - mappedYTop - drawHeight;
    if (!Number.isFinite(rawRectY) || rawRectY >= pageHeight || rawRectY + drawHeight <= 0) {
      continue;
    }

    const x = Math.max(0, mappedX);
    const width = Math.min(mappedWidth, pageWidth - x);
    if (width <= 0) continue;

    const rectY = Math.max(0, rawRectY);
    const rectHeight = Math.min(drawHeight, pageHeight - rectY);
    if (rectHeight <= 0) continue;

    const fontKey = resolveStandardFontKey(replacement.fontFamily, replacement.fontWeight, replacement.fontStyle);
    let fontPromise = fontCache.get(fontKey);
    if (!fontPromise) {
      fontPromise = pdf.embedFont(standardFonts[fontKey]);
      fontCache.set(fontKey, fontPromise);
    }

    let font: import("pdf-lib").PDFFont | null = null;
    try {
      font = await fontPromise;
    } catch {
      font = null;
    }

    let fallbackModule: TextFallbackModule | null = null;
    let fallbackLines: Awaited<ReturnType<TextFallbackModule["prepareTextLinesWithFallback"]>> | null = null;
    let useStandardFont = Boolean(font);

    if (font) {
      for (const line of lines) {
        if (line.length === 0) continue;
        try {
          font.encodeText(line);
        } catch {
          useStandardFont = false;
          break;
        }
      }
    }

    if (!useStandardFont) {
      try {
        fallbackModule = await loadTextFallback();
        const prepared = await fallbackModule.prepareTextLinesWithFallback(
          pdf,
          fallbackFontCache,
          text,
          fontSize
        );
        const hasDrawableRun = prepared.some((line) => line.runs.length > 0);
        if (!hasDrawableRun) {
          continue;
        }
        fallbackLines = prepared;
      } catch {
        continue;
      }
    }

    const textColor = parseCssColorToRgb(replacement.color);
    const pdfTextColor = rgb(textColor.r / 255, textColor.g / 255, textColor.b / 255);
    page.drawRectangle({
      x,
      y: rectY,
      width,
      height: rectHeight,
      color: rgb(1, 1, 1),
    });

    const textStartY = rectY + rectHeight - lineHeight + Math.max((lineHeight - fontSize) * 0.4, 0);
    if (useStandardFont && font) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex] ?? "";
        if (line.length === 0) continue;
        const y = textStartY - lineIndex * lineHeight;
        if (y < rectY - lineHeight) break;
        page.drawText(line, {
          x,
          y,
          maxWidth: width,
          size: fontSize,
          font,
          color: pdfTextColor,
        });
      }
      continue;
    }

    if (fallbackModule && fallbackLines) {
      fallbackModule.drawPreparedTextLines(page, fallbackLines, {
        x,
        y: textStartY,
        fontSize,
        lineHeight,
        color: pdfTextColor,
        opacity: 1,
        rotationDegrees: 0,
      });
    }
  }
}

function isEmptyOverlayJson(json: string | undefined) {
  if (!json) return true;
  const trimmed = json.trim();
  if (!trimmed || trimmed === "{}") return true;
  try {
    const parsed = JSON.parse(trimmed) as { objects?: unknown[] };
    return Array.isArray(parsed.objects) && parsed.objects.length === 0;
  } catch {
    return false;
  }
}

async function yieldToMainThread() {
  await new Promise<void>((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

export async function applyAnnotationOverlays(
  file: File,
  overlays: Record<number, string>,
  pageSize: { width: number; height: number },
  opts: ApplyAnnotationOverlayOptions = {}
): Promise<Uint8Array> {
  const pdfBytes = await file.arrayBuffer();

  const overlayByPage = new Map<number, string>();
  for (const [pageNumStr, json] of Object.entries(overlays)) {
    const pageNumber1Based = normalizePageNumber(pageNumStr);
    if (!pageNumber1Based) continue;
    const normalizedJson = json ?? "";
    if (isEmptyOverlayJson(normalizedJson)) continue;
    overlayByPage.set(pageNumber1Based, normalizedJson);
  }

  const textReplacementsByPage = normalizeTextReplacementsByPage(opts.textReplacementsByPage);
  const targetPages = Array.from(new Set<number>([...overlayByPage.keys(), ...textReplacementsByPage.keys()])).sort(
    (a, b) => a - b
  );
  if (targetPages.length === 0) {
    return new Uint8Array(pdfBytes);
  }

  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const pdf = await PDFDocument.load(pdfBytes);
  const total = targetPages.length;
  const chunkSize =
    typeof opts.yieldEveryPages === "number" && Number.isFinite(opts.yieldEveryPages)
      ? Math.max(1, Math.floor(opts.yieldEveryPages))
      : 2;
  const fontCache = new Map<StandardFontKey, Promise<import("pdf-lib").PDFFont>>();
  const fallbackFontCache = new Map<string, import("pdf-lib").PDFFont>();

  for (let index = 0; index < targetPages.length; index += 1) {
    const pageNumber1Based = targetPages[index];
    const pageIndex = pageNumber1Based - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) {
      opts.onProgress?.(index + 1, total);
      continue;
    }

    const page = pdf.getPage(pageIndex);
    const pageSizeFromMap = opts.pageSizesByPage?.[pageNumber1Based];
    const targetPageSize = isValidPageSize(pageSizeFromMap) ? pageSizeFromMap : pageSize;
    const overlaySize =
      isValidPageSize(targetPageSize)
        ? targetPageSize
        : { width: page.getWidth(), height: page.getHeight() };

    const textReplacements = textReplacementsByPage.get(pageNumber1Based);
    if (textReplacements && textReplacements.length > 0) {
      await drawTextReplacementsOnPage(
        pdf,
        page,
        textReplacements,
        overlaySize,
        StandardFonts,
        rgb,
        fontCache,
        fallbackFontCache
      );
    }

    const overlayJson = overlayByPage.get(pageNumber1Based);
    if (overlayJson) {
      const pngBytes = await renderFabricJsonToPngBytes(overlayJson, overlaySize);
      const png = await pdf.embedPng(pngBytes);
      page.drawImage(png, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }

    opts.onProgress?.(index + 1, total);
    if ((index + 1) % chunkSize === 0 && index < targetPages.length - 1) {
      await yieldToMainThread();
    }
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
