import { expect, test } from "playwright/test";
import { makePdfBytes } from "./utils";

test("clicking PDF text auto-enters Text edit mode", async ({ page }) => {
  test.setTimeout(180_000);
  const pdfBytes = await makePdfBytes("auto-text-mode", 1);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "auto-text-mode.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const editorFrame = page.frameLocator('iframe[title="PDF Editor"]');
  const firstPdfText = editorFrame.locator("#pdf-main .textLayer .text-border").first();
  await expect(firstPdfText).toBeVisible({ timeout: 120_000 });

  await firstPdfText.click();

  await expect(editorFrame.locator(".tool_text.active")).toBeVisible();
  await expect(editorFrame.locator('#pdf-main .__pdf_el_text [contenteditable="true"]').first()).toBeVisible();
});
