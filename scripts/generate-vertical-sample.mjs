import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const root = process.cwd();
const outputPath = path.join(root, "public", "document-vertical.pdf");

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595, 842]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

page.drawText("PDF Editor Vertical Regression Sample", {
  x: 48,
  y: 800,
  size: 18,
  font,
  color: rgb(0.1, 0.1, 0.1),
});

page.drawText("Horizontal baseline line for selection test", {
  x: 48,
  y: 760,
  size: 13,
  font,
  color: rgb(0, 0, 0),
});

page.drawText("VERTICAL_SAMPLE_ALPHA", {
  x: 120,
  y: 640,
  size: 14,
  font,
  color: rgb(0, 0, 0),
  rotate: degrees(90),
});

page.drawText("VERTICAL_SAMPLE_BETA", {
  x: 170,
  y: 620,
  size: 14,
  font,
  color: rgb(0, 0, 0),
  rotate: degrees(90),
});

page.drawText("ROTATED_NEGATIVE_90", {
  x: 360,
  y: 600,
  size: 14,
  font,
  color: rgb(0, 0, 0),
  rotate: degrees(-90),
});

page.drawRectangle({
  x: 46,
  y: 80,
  width: 500,
  height: 44,
  borderColor: rgb(0.85, 0.85, 0.85),
  borderWidth: 1,
});

page.drawText("Footer area for redact/eraser smoke tests", {
  x: 52,
  y: 97,
  size: 12,
  font,
  color: rgb(0.2, 0.2, 0.2),
});

const bytes = await pdfDoc.save();
fs.writeFileSync(outputPath, bytes);
console.info(`[generate-vertical-sample] wrote ${path.relative(root, outputPath)} (${bytes.length} bytes)`);
