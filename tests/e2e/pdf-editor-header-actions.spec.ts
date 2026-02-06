import { expect, test } from "./fixtures";
import { makePdfBytes, editorSaveDownloadButton } from "./utils";

test("pdf editor page header actions: Upload New, Change file", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfA = await makePdfBytes("header-actions-a", 1);
  const pdfB = await makePdfBytes("header-actions-b", 2);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "a.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfA),
  });

  const exportButton = editorSaveDownloadButton(page);
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  // Upload New should replace the file and re-load the editor.
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Upload New" }).click(),
  ]);
  await chooser.setFiles({
    name: "b.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfB),
  });

  await expect(page.getByText("b.pdf")).toBeVisible({ timeout: 30_000 });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  // Navigate back to edit and verify Change file returns to dropzone.
  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "a.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfA),
  });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  await page.getByRole("button", { name: "Change file" }).click();
  await expect(page.getByText("Drop your file here")).toBeVisible();
});
