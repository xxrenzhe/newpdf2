"use client";

import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import JSZip from "jszip";
import * as fabric from "fabric";
import { configurePdfJsWorker, pdfjs } from "./pdfjs";
import { decryptPdfBytes, encryptPdfBytes } from "./qpdf";

export type PdfCompressPreset = "balanced" | "small" | "smallest";
export type PdfRasterPreset = PdfCompressPreset;

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const [, base64] = dataUrl.split(",", 2);
  if (!base64) return new Uint8Array();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of copiedPages) merged.addPage(page);
  }

  return merged.save();
}

export async function splitPdfToZip(file: File, pageNumbers1Based?: number[]): Promise<Blob> {
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
  if (!opts.text) throw new Error("Watermark text is required");
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const opacity = Math.max(0, Math.min(1, opts.opacity));
  const fontSize = Math.max(8, Math.min(160, opts.fontSize));
  const rotation = degrees(opts.rotationDegrees);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(opts.text, fontSize);
    const x = (width - textWidth) / 2;
    const y = height / 2;

    page.drawText(opts.text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.55, 0.55, 0.55),
      rotate: rotation,
      opacity,
    });
  }

  return pdf.save();
}

export async function cropPdf(
  file: File,
  opts: { marginLeft: number; marginRight: number; marginTop: number; marginBottom: number }
): Promise<Uint8Array> {
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
  configurePdfJsWorker();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const zip = new JSZip();

  const scale = opts.dpi / 72;
  const quality = opts.quality ?? 0.85;
  const ext = opts.format === "jpg" ? "jpg" : "png";
  const mime = opts.format === "jpg" ? "image/jpeg" : "image/png";

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    const dataUrl = canvas.toDataURL(mime, quality);
    const bytes = dataUrlToUint8Array(dataUrl);
    zip.file(`${pageNum}.${ext}`, bytes);
  }

  return zip.generateAsync({ type: "blob" });
}

export async function extractPdfText(file: File): Promise<string> {
  configurePdfJsWorker();
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

export async function compressPdfRasterize(
  file: File,
  preset: PdfCompressPreset
): Promise<Uint8Array> {
  const presets: Record<PdfCompressPreset, { dpi: number; quality: number }> = {
    balanced: { dpi: 150, quality: 0.8 },
    small: { dpi: 120, quality: 0.65 },
    smallest: { dpi: 96, quality: 0.5 },
  };

  const { dpi, quality } = presets[preset];
  configurePdfJsWorker();

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

    const jpgDataUrl = canvas.toDataURL("image/jpeg", quality);
    const jpgBytes = dataUrlToUint8Array(jpgDataUrl);
    const embedded = await output.embedJpg(jpgBytes);

    const outPage = output.addPage([viewport1.width, viewport1.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: viewport1.width,
      height: viewport1.height,
    });
  }

  return output.save();
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  return canvas;
}

async function renderFabricJsonToCanvasElement(json: string, size: { width: number; height: number }) {
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

export async function redactPdfRasterize(
  file: File,
  overlays: Record<number, string>,
  preset: PdfRasterPreset
): Promise<Uint8Array> {
  const presets: Record<PdfRasterPreset, { dpi: number; quality: number }> = {
    balanced: { dpi: 150, quality: 0.85 },
    small: { dpi: 120, quality: 0.75 },
    smallest: { dpi: 96, quality: 0.65 },
  };
  const { dpi, quality } = presets[preset];

  configurePdfJsWorker();
  const data = new Uint8Array(await file.arrayBuffer());
  const input = await pdfjs.getDocument({ data }).promise;
  const output = await PDFDocument.create();

  const renderScale = dpi / 72;

  for (let pageNum = 1; pageNum <= input.numPages; pageNum++) {
    const page = await input.getPage(pageNum);
    const viewport1 = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: renderScale });

    const baseCanvas = createCanvas(viewport.width, viewport.height);
    const ctx = baseCanvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    await page.render({ canvasContext: ctx, canvas: baseCanvas, viewport }).promise;

    const overlayJson = overlays[pageNum];
    if (overlayJson) {
      const overlayCanvas = await renderFabricJsonToCanvasElement(overlayJson, {
        width: viewport1.width,
        height: viewport1.height,
      });
      ctx.drawImage(overlayCanvas, 0, 0, baseCanvas.width, baseCanvas.height);
    }

    const jpgDataUrl = baseCanvas.toDataURL("image/jpeg", quality);
    const jpgBytes = dataUrlToUint8Array(jpgDataUrl);
    const embedded = await output.embedJpg(jpgBytes);

    const outPage = output.addPage([viewport1.width, viewport1.height]);
    outPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: viewport1.width,
      height: viewport1.height,
    });
  }

  return output.save();
}

export async function signPdfWithPng(
  file: File,
  signaturePng: Uint8Array,
  opts: { pageNumber1Based: number; width: number; marginRight: number; marginBottom: number }
): Promise<Uint8Array> {
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

export async function applyAnnotationOverlays(
  file: File,
  overlays: Record<number, string>,
  pageSize: { width: number; height: number }
): Promise<Uint8Array> {
  const pdfBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(pdfBytes);

  for (const [pageNumStr, json] of Object.entries(overlays)) {
    const pageNumber1Based = Number(pageNumStr);
    if (!json) continue;
    if (!Number.isFinite(pageNumber1Based)) continue;
    const pageIndex = pageNumber1Based - 1;
    if (pageIndex < 0 || pageIndex >= pdf.getPageCount()) continue;

    const dataUrl = await renderFabricJsonToPngDataUrl(json, pageSize);
    const pngBytes = dataUrlToUint8Array(dataUrl);
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
