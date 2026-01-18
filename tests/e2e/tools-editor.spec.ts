import { expect, test } from "./fixtures";
import { makePdfBytes, expectPdfHeader, readDownloadBytes, drawSignatureStroke } from "./utils";

test("edit tool can load and download a PDF", async ({ page }) => {
  test.setTimeout(180_000);
  const pdfBytes = await makePdfBytes("editor", 2);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "editor.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  const bytes = await readDownloadBytes(download);
  expectPdfHeader(bytes);
});

test("sign tool can draw signature and download a PDF", async ({ page }) => {
  test.setTimeout(180_000);
  const pdfBytes = await makePdfBytes("sign", 1);

  await page.goto("/tools/sign");
  await page.locator('input[type="file"]').setInputFiles({
    name: "sign.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await drawSignatureStroke(canvas);

  const button = page.getByRole("button", { name: "Apply Signature & Download" });
  await expect(button).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;

  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);
});
