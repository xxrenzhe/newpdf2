import fs from "node:fs";
import { expect, test } from "playwright/test";
import { TOOLS } from "../../src/lib/tools";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function makePdfBytes(label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(`Playwright fixture: ${label}`, { x: 50, y: 780, size: 24, font, color: rgb(0, 0, 0) });
  return doc.save();
}

test("static pages render", async ({ page }) => {
  const routes = [
    "/",
    "/plan",
    "/faq",
    "/contact-us",
    "/privacy-policy",
    "/terms-and-conditions",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/unsubscribe",
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("Application error")).toHaveCount(0);
  }
});

for (const tool of TOOLS) {
  test(`tool page renders: ${tool.key}`, async ({ page }) => {
    await page.goto(tool.href);
    await expect(page.getByRole("heading", { name: tool.name })).toBeVisible();
  });
}

test("watermark tool downloads a PDF", async ({ page }) => {
  test.setTimeout(120_000);
  const pdfBytes = await makePdfBytes("watermark");

  await page.goto("/tools/watermark");
  await page.locator('input[type="file"]').setInputFiles({
    name: "watermark.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });
  await expect(page.getByRole("button", { name: "Apply & Download" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Apply & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-watermarked\.pdf$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = fs.readFileSync(downloadPath!);
  expect(bytes.subarray(0, 4).toString("utf8")).toBe("%PDF");
});

test("merge tool downloads a PDF", async ({ page }) => {
  test.setTimeout(120_000);
  const pdf1Bytes = await makePdfBytes("merge-a");
  const pdf2Bytes = await makePdfBytes("merge-b");

  await page.goto("/tools/merge");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf1Bytes) },
    { name: "b.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf2Bytes) },
  ]);
  await expect(page.getByRole("button", { name: "Merge & Download" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Merge & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("merged.pdf");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = fs.readFileSync(downloadPath!);
  expect(bytes.subarray(0, 4).toString("utf8")).toBe("%PDF");
});
