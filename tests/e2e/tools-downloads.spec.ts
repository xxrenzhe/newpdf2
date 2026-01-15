import { expect, test } from "playwright/test";
import { PDFDocument } from "pdf-lib";
import { readDownloadBytes, makePdfBytes, expectPdfHeader, loadPdfPageCount, repoPath, unzip } from "./utils";

test("header tools drawer navigates to a tool", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("button", { name: "Tools" }).click();
  await expect(page.getByRole("heading", { name: "All Tools" })).toBeVisible();
  await page.getByRole("link", { name: /Merge Documents/i }).click();
  await expect(page).toHaveURL(/\/tools\/merge(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Merge Documents" })).toBeVisible();
});

test("delete pages supports late-page thumbnail render (regression)", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/tools/delete");
  await page.locator('input[type="file"]').setInputFiles(repoPath("public/ALA_HRDR_CDRG_17-18Printable.pdf"));

  const lastPageButton = page.getByRole("button", { name: /Page 56/i });
  await lastPageButton.scrollIntoViewIfNeeded();
  await expect(lastPageButton.locator("img")).toBeVisible({ timeout: 120_000 });
});

test("watermark downloads a PDF", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/tools/watermark");
  await page.locator('input[type="file"]').setInputFiles(repoPath("public/job-search-strategies.pdf"));
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Apply & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-watermarked\.pdf$/);
  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
});

test("merge downloads a PDF with combined pages", async ({ page }) => {
  test.setTimeout(120_000);
  const pdfA = await makePdfBytes("merge-a", 2);
  const pdfB = await makePdfBytes("merge-b", 3);

  await page.goto("/tools/merge");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfA) },
    { name: "b.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfB) },
  ]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Merge & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("merged.pdf");
  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  await expect.poll(() => loadPdfPageCount(bytes)).toBe(5);
});

test("split (extract) downloads a PDF with expected page count", async ({ page }) => {
  test.setTimeout(120_000);
  const pdf = await makePdfBytes("split", 3);

  await page.goto("/tools/split");
  await page.locator('input[type="file"]').setInputFiles({
    name: "split.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await page.getByRole("textbox").fill("1-2");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Extract & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-extracted\.pdf$/);
  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  await expect.poll(() => loadPdfPageCount(bytes)).toBe(2);
});

test("split (zip) downloads a ZIP with per-page PDFs", async ({ page }) => {
  test.setTimeout(180_000);
  const pdf = await makePdfBytes("split-zip", 2);

  await page.goto("/tools/split");
  await page.locator('input[type="file"]').setInputFiles({
    name: "split.zip.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  await page.getByRole("button", { name: /Split to ZIP/i }).click();
  await page.getByRole("textbox").fill("1-2");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Split & Download ZIP" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-split\.zip$/);
  const zipBytes = await readDownloadBytes(download);
  const zip = await unzip(zipBytes);
  const entries = Object.keys(zip.files).filter((name) => name.endsWith(".pdf")).sort();
  expect(entries).toEqual(["1.pdf", "2.pdf"]);
  const firstPdf = await zip.file("1.pdf")!.async("uint8array");
  expectPdfHeader(firstPdf);
});

test("compress downloads a PDF", async ({ page }) => {
  test.setTimeout(180_000);
  const pdf = await makePdfBytes("compress", 2);

  await page.goto("/tools/compress");
  await page.locator('input[type="file"]').setInputFiles({
    name: "compress.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compress & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-compressed-(balanced|small|smallest)\.pdf$/);
  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  await expect.poll(() => loadPdfPageCount(bytes)).toBe(2);
});

test("crop downloads a PDF with CropBox entries", async ({ page }) => {
  test.setTimeout(120_000);
  const pdf = await makePdfBytes("crop", 1);

  await page.goto("/tools/crop");
  await page.locator('input[type="file"]').setInputFiles({
    name: "crop.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Crop & Download" }).click();
  const download = await downloadPromise;

  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  const out = await PDFDocument.load(bytes);
  const p0 = out.getPage(0);
  const crop = p0.getCropBox();
  expect(crop.x).toBeGreaterThan(0);
  expect(crop.y).toBeGreaterThan(0);
  expect(crop.width).toBeLessThan(p0.getWidth());
  expect(crop.height).toBeLessThan(p0.getHeight());
});

test("convert PDF → text downloads a TXT", async ({ page }) => {
  test.setTimeout(180_000);
  const pdf = await makePdfBytes("convert-text", 2);

  await page.goto("/tools/convert");
  await page.locator('input[type="file"]').setInputFiles({
    name: "convert.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  await page.locator("main select").first().selectOption("pdf-to-text");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Convert & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.txt$/);
  const textBytes = await readDownloadBytes(download);
  const text = Buffer.from(textBytes).toString("utf8");
  expect(text).toContain("Playwright fixture: convert-text");
});

test("convert PDF → images downloads a ZIP", async ({ page }) => {
  test.setTimeout(240_000);
  const pdf = await makePdfBytes("convert-images", 1);

  await page.goto("/tools/convert");
  await page.locator('input[type="file"]').setInputFiles({
    name: "convert.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  await page.locator("main select").first().selectOption("pdf-to-images");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Convert & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-images\.zip$/);
  const zipBytes = await readDownloadBytes(download);
  const zip = await unzip(zipBytes);
  const images = Object.keys(zip.files).filter((name) => /\.(png|jpg)$/i.test(name));
  expect(images.length).toBeGreaterThanOrEqual(1);
});

test("convert images → PDF downloads a PDF", async ({ page }) => {
  test.setTimeout(120_000);
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X4n5kAAAAASUVORK5CYII=";
  const png = Buffer.from(pngBase64, "base64");

  await page.goto("/tools/convert");
  await page.locator('input[type="file"]').setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: png,
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Convert & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("images.pdf");
  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  await expect.poll(() => loadPdfPageCount(bytes)).toBe(1);
});

test("sign downloads a PDF containing an embedded image", async ({ page }) => {
  test.setTimeout(180_000);
  const pdf = await makePdfBytes("sign", 1);

  await page.goto("/tools/sign");
  await page.locator('input[type="file"]').setInputFiles({
    name: "sign.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  const pad = page.locator("canvas").first();
  const box = await pad.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width * 0.2;
  const y = box!.y + box!.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + box!.width * 0.4, y - box!.height * 0.2);
  await page.mouse.move(x + box!.width * 0.6, y + box!.height * 0.15);
  await page.mouse.up();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Apply Signature & Download" }).click();
  const download = await downloadPromise;

  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  expect(Buffer.from(bytes).toString("latin1")).toContain("/Subtype /Image");
});

test("password protect + unlock roundtrip works", async ({ page }) => {
  test.setTimeout(240_000);
  const pdf = await makePdfBytes("password-roundtrip", 1);

  await page.goto("/tools/password");
  await page.locator('input[type="file"]').setInputFiles({
    name: "roundtrip.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await page.getByPlaceholder("Enter password...").fill("Abc123!!");
  await page.getByPlaceholder("Confirm password...").fill("Abc123!!");

  const protectedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Protect & Download" }).click();
  const protectedDownload = await protectedDownloadPromise;

  const protectedBytes = await readDownloadBytes(protectedDownload);
  expectPdfHeader(protectedBytes);
  expect(Buffer.from(protectedBytes).toString("latin1")).toContain("/Encrypt");

  await page.goto("/tools/unlock");
  await page.locator('input[type="file"]').setInputFiles({
    name: protectedDownload.suggestedFilename() || "protected.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(protectedBytes),
  });
  await page.getByPlaceholder("Enter PDF password...").fill("Abc123!!");
  await expect(page.getByRole("button", { name: "Unlock & Download" })).toBeEnabled();

  const unlockedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unlock & Download" }).click();
  const unlockedDownload = await unlockedDownloadPromise;

  const unlockedBytes = await readDownloadBytes(unlockedDownload);
  expectPdfHeader(unlockedBytes);
  expect(Buffer.from(unlockedBytes).toString("latin1")).not.toContain("/Encrypt");
  await expect.poll(() => loadPdfPageCount(unlockedBytes)).toBe(1);
});

test("redact exports a rasterized PDF", async ({ page }) => {
  test.setTimeout(240_000);
  const pdf = await makePdfBytes("redact", 1);

  await page.goto("/tools/redact");
  await page.locator('input[type="file"]').setInputFiles({
    name: "redact.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export redacted PDF" }).click();
  const download = await downloadPromise;

  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  expect(Buffer.from(bytes).toString("latin1")).toContain("/Subtype /Image");
});

test("delete pages exports PDF with removed pages", async ({ page }) => {
  test.setTimeout(180_000);
  const pdf = await makePdfBytes("delete-pages", 3);

  await page.goto("/tools/delete");
  await page.locator('input[type="file"]').setInputFiles({
    name: "delete.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  await page.getByRole("button", { name: /Page 2/i }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;

  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  await expect.poll(() => loadPdfPageCount(bytes)).toBe(2);
});

test("organize pages can reorder/rotate and export", async ({ page }) => {
  test.setTimeout(240_000);
  const pdf = await makePdfBytes("organize", 2);

  await page.goto("/tools/organize");
  await page.locator('input[type="file"]').setInputFiles({
    name: "organize.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled({ timeout: 60_000 });

  // Move page 2 up (swap pages).
  await page.getByTitle("Move up").nth(1).click();

  // Select the first visible page card (now original page 2) and rotate right.
  await page.locator('button[title="Select"]').first().click();
  await page.getByTitle("Rotate right").click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;

  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);

  const out = await PDFDocument.load(bytes);
  expect(out.getPageCount()).toBe(2);
  const first = out.getPage(0);
  expect(first.getRotation().angle).toBe(90);
  const { width, height } = first.getSize();
  expect([Math.round(width), Math.round(height)]).toEqual([520, 720]);
});

test("pdfeditor (edit) loads and Save downloads a PDF", async ({ page }) => {
  test.setTimeout(240_000);
  const pdf = await makePdfBytes("pdfeditor-save", 2);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "edit.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled({ timeout: 120_000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save" }).click();
  const download = await downloadPromise;

  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  await expect.poll(() => loadPdfPageCount(bytes)).toBe(2);
});

test("pdfeditor insert page increases output page count", async ({ page }) => {
  test.setTimeout(240_000);
  const pdf = await makePdfBytes("pdfeditor-insert", 2);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "insert.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });

  const frame = page.frameLocator('iframe[title="PDF Editor"]');
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled({ timeout: 120_000 });

  await frame.locator(".tab-item", { hasText: "Insert" }).click();
  await frame.locator("#tool_insert_pages").click();
  await frame.getByRole("button", { name: "OK" }).click();

  await expect(frame.locator('.pdf-main-box .__pdf_page_preview[data-page="3"]')).toHaveCount(1, { timeout: 120_000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save" }).click();
  const download = await downloadPromise;

  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
  await expect.poll(() => loadPdfPageCount(bytes)).toBe(3);
});
