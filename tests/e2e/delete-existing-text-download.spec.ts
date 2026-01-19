import { expect, test } from "./fixtures";
import { expectPdfHeader, makePdfBytes, readDownloadBytes } from "./utils";

test("deleting existing PDF text keeps a redaction cover on export", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("delete-existing-text-download", 1);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "delete-existing-text-download.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frame = page.frameLocator('iframe[title="PDF Editor"]');
  const firstText = frame.locator("#pdf-main .textLayer .text-border").first();
  await expect(firstText).toBeVisible({ timeout: 120_000 });
  await firstText.click();

  const editable = frame.locator('#pdf-main .__pdf_el_text [contenteditable="true"]').first();
  await expect(editable).toBeVisible({ timeout: 120_000 });
  await editable.click();
  await editable.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await editable.press("Backspace");

  await frame.locator("#pdf-toolbar").click({ position: { x: 8, y: 8 } });

  await expect(frame.locator("#pdf-main .__pdf_editor_element.__pdf_el_text")).toHaveCount(1);

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;

  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);

  await expect(frame.locator(".__l_overlay")).toHaveCount(0, { timeout: 120_000 });
});

