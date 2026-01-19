import { expect, test } from "./fixtures";
import type { Frame } from "playwright/test";
import { expectPdfHeader, makePdfBytes, readDownloadBytes } from "./utils";

test("Save & Download still works if editor pages array contains undefined entries", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("save-download-page-id-guard", 1);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "save-download-page-id-guard.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frameLocator = page.frameLocator('iframe[title="PDF Editor"]');
  const firstText = frameLocator.locator("#pdf-main .textLayer .text-border").first();
  await expect(firstText).toBeVisible({ timeout: 120_000 });
  await firstText.click();

  const editable = frameLocator.locator('#pdf-main .__pdf_el_text [contenteditable="true"]').first();
  await expect(editable).toBeVisible({ timeout: 120_000 });

  await editable.click();
  await editable.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await editable.type("Updated");
  await frameLocator.locator("#pdf-toolbar").click({ position: { x: 8, y: 8 } });

  const iframe = page.frame({ url: /\/pdfeditor\/index\.html/ }) as Frame | null;
  if (!iframe) throw new Error("Missing pdfeditor iframe");

  await iframe.evaluate(() => {
    // Regression guard: some PDFs end up with unexpected `undefined` entries in
    // the editor page cache, which should not crash font resolution.
    const editor = (window as any).editor;
    editor?.pdfDocument?.pages?.push?.(undefined);
  });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;

  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);

  await expect(frameLocator.locator(".__l_overlay")).toHaveCount(0, { timeout: 120_000 });
});
