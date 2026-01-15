import fs from "node:fs";
import path from "node:path";
import type { Download } from "playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

export function repoPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

export async function makePdfBytes(label: string, pageCount = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const size: [number, number] = i % 2 === 0 ? [320, 420] : [520, 720];
    const page = doc.addPage(size);
    page.drawText(`Playwright fixture: ${label} (page ${i + 1})`, {
      x: 24,
      y: size[1] - 48,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return doc.save();
}

export async function readDownloadBytes(download: Download): Promise<Uint8Array> {
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Playwright download has no path()");
  return new Uint8Array(fs.readFileSync(downloadPath));
}

export function expectPdfHeader(bytes: Uint8Array) {
  const head = Buffer.from(bytes.subarray(0, 4)).toString("utf8");
  if (head !== "%PDF") throw new Error(`Expected PDF header %PDF, got ${JSON.stringify(head)}`);
}

export async function loadPdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function unzip(bytes: Uint8Array) {
  return JSZip.loadAsync(bytes);
}
