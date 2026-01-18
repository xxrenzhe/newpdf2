import { expect, test } from "./fixtures";
import { expectPdfHeader, makePdfBytes, readDownloadBytes } from "./utils";

test("guest edit-pdf download completes and output reopens without font extraction errors", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("guest-fonts", 1);

  const fontExtractErrors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Cannot extract the embedded font")) fontExtractErrors.push(text);
  });

  await page.goto("/app/guest/document?chosenTool=edit-pdf");
  await page.locator('input[type="file"]').setInputFiles({
    name: "guest-fonts.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frame = page.frameLocator('iframe[title="PDF Editor"]');
  await expect(frame.locator("#pdf-main .__pdf_page_preview").first()).toBeVisible({ timeout: 120_000 });

  await frame.locator(".tab-item", { hasText: "Edit" }).click();
  await frame.locator("#tool_text").click();
  await frame.locator("#pdf-main .__pdf_page_preview").first().click({ position: { x: 160, y: 160 } });

  const editable = frame.locator("#pdf-main .__pdf_editor_element [contenteditable='true']").last();
  await expect(editable).toBeVisible({ timeout: 120_000 });
  await editable.click();
  await editable.type("こんにちは");

  await frame.locator("#pdf-toolbar").click({ position: { x: 8, y: 8 } });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;

  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);

  await expect(frame.locator(".__l_overlay")).toHaveCount(0, { timeout: 120_000 });

  fontExtractErrors.length = 0;

  await page.goto("/app/guest/document?chosenTool=edit-pdf");
  await page.locator('input[type="file"]').setInputFiles({
    name: "guest-fonts-out.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(outBytes),
  });

  await expect(page.getByRole("button", { name: "Save & Download" })).toBeEnabled({ timeout: 120_000 });
  await page.waitForTimeout(1500);

  expect(fontExtractErrors).toEqual([]);
});
