import { expect, test } from "./fixtures";
import { expectPdfHeader, makePdfBytes, readDownloadBytes, editorSaveDownloadButton } from "./utils";

test("editing existing PDF text can Save & Download without hanging", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("edit-existing-text-download", 1);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "edit-existing-text-download.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = editorSaveDownloadButton(page);
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frame = page.frameLocator('iframe[title="PDF Editor"]');
  let editable = frame.locator('#pdf-main [contenteditable], #pdf-main [contenteditable="true"]').first();
  if ((await editable.count()) === 0) {
    const firstText = frame.locator(
      "#pdf-main .textLayer .text-border, #pdf-main .textLayer span, #pdf-main .__pdf_el_text"
    ).first();
    if ((await firstText.count()) > 0) {
      await firstText.click();
    }
    editable = frame.locator('#pdf-main [contenteditable], #pdf-main [contenteditable="true"]').first();
  }

  if ((await editable.count()) > 0) {
    await editable.click();
    await editable.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await editable.type("Updated");
    await frame.locator("#pdf-toolbar").click({ position: { x: 8, y: 8 } });
  }

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;

  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);

  await expect(frame.locator(".__l_overlay")).toHaveCount(0, { timeout: 120_000 });
});
