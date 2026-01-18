import { expect, test } from "./fixtures";
import { makePdfBytes } from "./utils";

test("guest edit-pdf keeps actions top-right and renders PDF", async ({ page }) => {
  test.setTimeout(180_000);
  const pdfBytes = await makePdfBytes("guest-editor", 1);

  await page.goto("/app/guest/document?chosenTool=edit-pdf");
  await page.locator('input[type="file"]').setInputFiles({
    name: "guest-editor.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  await expect(page).toHaveURL(/\/app\/guest\/document\?chosenTool=edit-pdf&documentId=/);

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const box = await exportButton.boundingBox();
  const viewport = page.viewportSize();
  if (!box) throw new Error("Missing export button bounding box");
  if (!viewport) throw new Error("Missing viewport size");

  expect(box.x).toBeGreaterThan(viewport.width * 0.5);
  expect(box.x + box.width).toBeGreaterThan(viewport.width - 80);

  const editorFrame = page.frameLocator('iframe[title="PDF Editor"]');
  await expect(editorFrame.locator("#pdf-main .__pdf_page_preview").first()).toBeVisible({ timeout: 120_000 });
});
