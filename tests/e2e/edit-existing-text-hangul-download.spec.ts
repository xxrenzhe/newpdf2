import { expect, test } from "./fixtures";
import { expectPdfHeader, makePdfBytes, readDownloadBytes } from "./utils";

test("editing existing PDF text can Save & Download after typing Hangul", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("edit-existing-text-hangul-download", 1);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "edit-existing-text-hangul-download.pdf",
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
  await editable.type("테스트");
  await frame.locator("#pdf-toolbar").click({ position: { x: 8, y: 8 } });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;

  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);

  await expect(frame.locator(".__l_overlay")).toHaveCount(0, { timeout: 120_000 });
});

