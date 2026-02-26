/// <reference lib="webworker" />

import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist-v2/legacy/build/pdf";

type PdfCompressPreset = "balanced" | "small" | "smallest";
type PdfRasterPreset = PdfCompressPreset;

type RasterWorkerCompressRequest = {
  type: "compress";
  jobId: number;
  data: ArrayBuffer;
  preset: PdfCompressPreset;
};

type RasterWorkerRedactRequest = {
  type: "redact";
  jobId: number;
  data: ArrayBuffer;
  preset: PdfRasterPreset;
  overlays: Record<number, string>;
};

type RasterWorkerRequest = RasterWorkerCompressRequest | RasterWorkerRedactRequest;

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

const COMPRESS_PRESETS: Record<PdfCompressPreset, { dpi: number; quality: number }> = {
  balanced: { dpi: 150, quality: 0.8 },
  small: { dpi: 120, quality: 0.65 },
  smallest: { dpi: 96, quality: 0.5 },
};

const REDACT_PRESETS: Record<PdfRasterPreset, { dpi: number; quality: number }> = {
  balanced: { dpi: 150, quality: 0.85 },
  small: { dpi: 120, quality: 0.75 },
  smallest: { dpi: 96, quality: 0.65 },
};

function isWorkerRequest(value: unknown): value is RasterWorkerRequest {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.type !== "string" || typeof record.jobId !== "number") return false;
  if (!(record.data instanceof ArrayBuffer)) return false;
  if (record.type === "compress") {
    return record.preset === "balanced" || record.preset === "small" || record.preset === "smallest";
  }
  if (record.type === "redact") {
    return (
      (record.preset === "balanced" || record.preset === "small" || record.preset === "smallest") &&
      !!record.overlays &&
      typeof record.overlays === "object"
    );
  }
  return false;
}

function postProgress(message: RasterWorkerProgress) {
  self.postMessage(message);
}

function postResult(message: RasterWorkerResult) {
  self.postMessage(message, [message.bytes]);
}

function postError(message: RasterWorkerError) {
  self.postMessage(message);
}

function createCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "function") {
    throw new Error("OffscreenCanvas is not supported in this environment");
  }
  return new OffscreenCanvas(Math.ceil(width), Math.ceil(height));
}

async function offscreenCanvasToBytes(
  canvas: OffscreenCanvas,
  type: "image/jpeg" | "image/png",
  quality?: number
) {
  if (typeof canvas.convertToBlob !== "function") {
    throw new Error("OffscreenCanvas.convertToBlob is unavailable");
  }
  const blob = await canvas.convertToBlob({ type, quality });
  return new Uint8Array(await blob.arrayBuffer());
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseOverlayObjects(overlayJson: string) {
  try {
    const parsed = JSON.parse(overlayJson) as { objects?: unknown[] } | null;
    if (!parsed || !Array.isArray(parsed.objects)) return [];
    return parsed.objects;
  } catch {
    return [];
  }
}

function drawRedactionsToContext(
  context: OffscreenCanvasRenderingContext2D,
  overlayJson: string,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const objects = parseOverlayObjects(overlayJson);
  if (!objects.length) return;

  const ratioX = targetWidth / Math.max(1, sourceWidth);
  const ratioY = targetHeight / Math.max(1, sourceHeight);

  for (const raw of objects) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const type = typeof item.type === "string" ? item.type.toLowerCase() : "";
    if (type && type !== "rect") continue;
    if (item.visible === false) continue;

    const width = Math.abs(numberOr(item.width, 0) * numberOr(item.scaleX, 1));
    const height = Math.abs(numberOr(item.height, 0) * numberOr(item.scaleY, 1));
    if (width <= 0 || height <= 0) continue;

    const left = numberOr(item.left, 0);
    const top = numberOr(item.top, 0);
    const angleDeg = numberOr(item.angle, 0);
    const opacity = Math.max(0, Math.min(1, numberOr(item.opacity, 1)));
    const fill = typeof item.fill === "string" && item.fill.trim().length > 0 ? item.fill : "#000000";

    const x = left * ratioX;
    const y = top * ratioY;
    const w = width * ratioX;
    const h = height * ratioY;

    context.save();
    context.globalAlpha = opacity;
    context.fillStyle = fill;
    if (angleDeg !== 0) {
      const radians = (angleDeg * Math.PI) / 180;
      const cx = x + w / 2;
      const cy = y + h / 2;
      context.translate(cx, cy);
      context.rotate(radians);
      context.fillRect(-w / 2, -h / 2, w, h);
    } else {
      context.fillRect(x, y, w, h);
    }
    context.restore();
  }
}

async function runCompressTask(request: RasterWorkerCompressRequest) {
  const { dpi, quality } = COMPRESS_PRESETS[request.preset];
  const renderScale = dpi / 72;

  const sourceBytes = new Uint8Array(request.data);
  const input = await pdfjs
    .getDocument({ data: sourceBytes, disableWorker: true } as unknown as Parameters<typeof pdfjs.getDocument>[0])
    .promise;
  const output = await PDFDocument.create();

  try {
    for (let pageNum = 1; pageNum <= input.numPages; pageNum++) {
      const page = await input.getPage(pageNum);
      const viewport1 = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D context unavailable");

      const renderTask = (
        page as unknown as {
          render: (params: Record<string, unknown>) => { promise: Promise<void> };
        }
      ).render({
        canvasContext: context as unknown,
        canvas,
        viewport,
      });
      await renderTask.promise;

      const jpgBytes = await offscreenCanvasToBytes(canvas, "image/jpeg", quality);
      const embedded = await output.embedJpg(jpgBytes);
      const outPage = output.addPage([viewport1.width, viewport1.height]);
      outPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: viewport1.width,
        height: viewport1.height,
      });

      (page as { cleanup?: () => void }).cleanup?.();
      postProgress({
        type: "raster-progress",
        jobId: request.jobId,
        current: pageNum,
        total: input.numPages,
      });
    }

    const bytes = await output.save();
    const transfer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    postResult({
      type: "raster-result",
      jobId: request.jobId,
      bytes: transfer,
    });
  } finally {
    await input.destroy().catch(() => {});
  }
}

async function runRedactTask(request: RasterWorkerRedactRequest) {
  const { dpi, quality } = REDACT_PRESETS[request.preset];
  const renderScale = dpi / 72;
  const sourceBytes = new Uint8Array(request.data);
  const hasRedactions = Object.keys(request.overlays).length > 0;

  if (!hasRedactions) {
    const transfer = sourceBytes.buffer.slice(
      sourceBytes.byteOffset,
      sourceBytes.byteOffset + sourceBytes.byteLength
    ) as ArrayBuffer;
    postResult({
      type: "raster-result",
      jobId: request.jobId,
      bytes: transfer,
    });
    return;
  }

  const input = await pdfjs
    .getDocument({ data: sourceBytes, disableWorker: true } as unknown as Parameters<typeof pdfjs.getDocument>[0])
    .promise;
  const sourceDoc = await PDFDocument.load(sourceBytes);
  const output = await PDFDocument.create();
  const totalPages = Math.min(input.numPages, sourceDoc.getPageCount());

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const overlayJson = request.overlays[pageNum];
      if (!overlayJson) {
        const [copied] = await output.copyPages(sourceDoc, [pageNum - 1]);
        output.addPage(copied);
        postProgress({
          type: "raster-progress",
          jobId: request.jobId,
          current: pageNum,
          total: totalPages,
        });
        continue;
      }

      const page = await input.getPage(pageNum);
      const viewport1 = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D context unavailable");

      const renderTask = (
        page as unknown as {
          render: (params: Record<string, unknown>) => { promise: Promise<void> };
        }
      ).render({
        canvasContext: context as unknown,
        canvas,
        viewport,
      });
      await renderTask.promise;

      drawRedactionsToContext(
        context,
        overlayJson,
        viewport1.width,
        viewport1.height,
        canvas.width,
        canvas.height
      );

      const jpgBytes = await offscreenCanvasToBytes(canvas, "image/jpeg", quality);
      const embedded = await output.embedJpg(jpgBytes);
      const outPage = output.addPage([viewport1.width, viewport1.height]);
      outPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: viewport1.width,
        height: viewport1.height,
      });

      (page as { cleanup?: () => void }).cleanup?.();
      postProgress({
        type: "raster-progress",
        jobId: request.jobId,
        current: pageNum,
        total: totalPages,
      });
    }

    const bytes = await output.save();
    const transfer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    postResult({
      type: "raster-result",
      jobId: request.jobId,
      bytes: transfer,
    });
  } finally {
    await input.destroy().catch(() => {});
  }
}

self.onmessage = (evt: MessageEvent<unknown>) => {
  if (!isWorkerRequest(evt.data)) return;
  const request = evt.data;

  const task =
    request.type === "compress"
      ? runCompressTask(request)
      : runRedactTask(request);

  void task.catch((error: unknown) => {
    const message = error instanceof Error && error.message ? error.message : "Raster worker task failed";
    postError({
      type: "raster-error",
      jobId: request.jobId,
      message,
    });
  });
};

export {};
