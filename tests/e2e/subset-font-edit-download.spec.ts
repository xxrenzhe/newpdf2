import fs from "node:fs";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { expect, test } from "./fixtures";
import { expectPdfHeader, readDownloadBytes, repoPath, editorSaveDownloadButton } from "./utils";

async function makeSubsetFontPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const fontBytes = fs.readFileSync(
    repoPath("packages/pdfeditor/src/assets/art_font/Charmonman-Regular.ttf")
  );
  const font = await doc.embedFont(fontBytes, { subset: true });

  const page = doc.addPage([420, 520]);
  page.drawText("AAAA", { x: 48, y: 420, size: 48, font, color: rgb(0, 0, 0) });

  return doc.save();
}

test("subset font PDF can edit text and Save & Download without hanging", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makeSubsetFontPdfBytes();

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "subset-font-edit-download.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = editorSaveDownloadButton(page);
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frame = page.frameLocator('iframe[title="PDF Editor"]');
  const firstText = frame.locator("#pdf-main .textLayer .text-border").first();
  await expect(firstText).toBeVisible({ timeout: 120_000 });
  await firstText.click();

  const editable = frame.locator('#pdf-main .__pdf_el_text [contenteditable="true"]').first();
  await expect(editable).toBeVisible({ timeout: 120_000 });

  await editable.click();
  await editable.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await editable.type("BBBB");
  await frame.locator("#pdf-toolbar").click({ position: { x: 8, y: 8 } });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;

  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);

  await expect(frame.locator(".__l_overlay")).toHaveCount(0, { timeout: 120_000 });
});
