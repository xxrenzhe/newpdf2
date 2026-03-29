import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Download, Locator, Page } from "playwright/test";

async function loadPdfLib() {
  return import("pdf-lib");
}

async function loadJsZip() {
  const module = await import("jszip");
  return module.default;
}

async function loadPdfJsV2() {
  const module = await import("pdfjs-dist-v2/legacy/build/pdf.js");
  return (module.default ?? module) as {
    getDocument: (
      src: unknown
    ) => {
      promise: Promise<{
        getPage: (pageNumber: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }>;
        destroy: () => Promise<void>;
      }>;
    };
  };
}

export function repoPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

export const E2E_TEST_IDS = {
  toolUploadBrowse: "tool-upload-browse",
  toolUploadInput: "tool-upload-input",
  editorUploadNew: "pdf-editor-upload-new",
  editorUploadInput: "pdf-editor-upload-input",
  editorSaveDownload: "pdf-editor-save-download",
} as const;

export function toolUploadBrowseButton(page: Page): Locator {
  return page.getByTestId(E2E_TEST_IDS.toolUploadBrowse).first();
}

export function editorSaveDownloadButton(page: Page): Locator {
  return page.getByTestId(E2E_TEST_IDS.editorSaveDownload);
}

export async function makePdfBytes(label: string, pageCount = 2): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
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

export function pdfContainsToken(bytes: Uint8Array, token: string): boolean {
  const pdf = Buffer.from(bytes);
  const rawText = pdf.toString("latin1");
  if (rawText.includes(token)) return true;

  const streamKeyword = Buffer.from("stream");
  const endstreamKeyword = Buffer.from("endstream");
  let searchFrom = 0;

  while (searchFrom < pdf.length) {
    const streamPos = pdf.indexOf(streamKeyword, searchFrom);
    if (streamPos < 0) break;

    const dictStart = Math.max(0, streamPos - 512);
    const dictSnippet = pdf.toString("latin1", dictStart, streamPos);
    const isFlateDecode = dictSnippet.includes("/FlateDecode");

    let streamDataStart = streamPos + streamKeyword.length;
    if (pdf[streamDataStart] === 0x0d && pdf[streamDataStart + 1] === 0x0a) {
      streamDataStart += 2;
    } else if (pdf[streamDataStart] === 0x0d || pdf[streamDataStart] === 0x0a) {
      streamDataStart += 1;
    }

    const endstreamPos = pdf.indexOf(endstreamKeyword, streamDataStart);
    if (endstreamPos < 0) break;

    let streamDataEnd = endstreamPos;
    if (pdf[streamDataEnd - 2] === 0x0d && pdf[streamDataEnd - 1] === 0x0a) {
      streamDataEnd -= 2;
    } else if (pdf[streamDataEnd - 1] === 0x0d || pdf[streamDataEnd - 1] === 0x0a) {
      streamDataEnd -= 1;
    }

    if (isFlateDecode && streamDataEnd > streamDataStart) {
      try {
        const decoded = zlib.inflateSync(pdf.subarray(streamDataStart, streamDataEnd));
        if (decoded.toString("latin1").includes(token)) return true;
      } catch {
        // Ignore streams that are not valid zlib payloads for this check.
      }
    }

    searchFrom = endstreamPos + endstreamKeyword.length;
  }

  return false;
}

export async function loadPdfPageCount(bytes: Uint8Array): Promise<number> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function extractPdfText(bytes: Uint8Array, pageNumber = 1): Promise<string> {
  const pdfjs = await loadPdfJsV2();
  const input = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  try {
    const page = await input.getPage(pageNumber);
    const textContent = await page.getTextContent();
    return textContent.items
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const text = (item as { str?: unknown }).str;
        return typeof text === "string" ? text : "";
      })
      .join(" ")
      .trim();
  } finally {
    await input.destroy().catch(() => {});
  }
}

export async function unzip(bytes: Uint8Array) {
  const JSZip = await loadJsZip();
  return JSZip.loadAsync(bytes);
}

export async function drawSignatureStroke(canvas: Locator) {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing signature canvas bounding box");

  const start = { x: box.x + box.width * 0.2, y: box.y + box.height * 0.6 };
  const mid = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.4 };
  const end = { x: box.x + box.width * 0.8, y: box.y + box.height * 0.65 };
  const pointer = { pointerId: 1, pointerType: "pen", isPrimary: true };

  await canvas.dispatchEvent("pointerdown", { bubbles: true, cancelable: true, buttons: 1, clientX: start.x, clientY: start.y, ...pointer });
  await canvas.dispatchEvent("pointermove", { bubbles: true, cancelable: true, buttons: 1, clientX: mid.x, clientY: mid.y, ...pointer });
  await canvas.dispatchEvent("pointermove", { bubbles: true, cancelable: true, buttons: 1, clientX: end.x, clientY: end.y, ...pointer });
  await canvas.dispatchEvent("pointerup", { bubbles: true, cancelable: true, buttons: 0, clientX: end.x, clientY: end.y, ...pointer });
}
