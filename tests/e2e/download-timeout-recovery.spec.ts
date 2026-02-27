import { expect, test } from "./fixtures";
import { editorSaveDownloadButton, makePdfBytes } from "./utils";

test("save timeout fallback clears busy state when download command is blocked in iframe", async ({ page }) => {
  test.setTimeout(240_000);

  const pdfBytes = await makePdfBytes("download-timeout-recovery", 1);

  await page.goto("/tools/edit?__pdfDownloadTimeoutMs=1500");
  await page.locator('input[type="file"]').setInputFiles({
    name: "download-timeout-recovery.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = editorSaveDownloadButton(page);
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });
  const postMessagePatched = await page.evaluate(() => {
    const frame = document.querySelector("iframe");
    if (!(frame instanceof HTMLIFrameElement) || !frame.contentWindow) {
      return false;
    }

    const frameWindow = frame.contentWindow;
    const original = frameWindow.postMessage.bind(frameWindow);

    try {
      frameWindow.postMessage = ((message: unknown, targetOrigin?: string, transfer?: Transferable[]) => {
        if (
          message &&
          typeof message === "object" &&
          "type" in message &&
          (message as { type?: unknown }).type === "download"
        ) {
          return;
        }
        return original(message, targetOrigin as string, transfer as Transferable[]);
      }) as Window["postMessage"];
      return true;
    } catch {
      return false;
    }
  });

  if (!postMessagePatched) {
    throw new Error("Failed to patch iframe postMessage");
  }

  let downloadTriggered = false;
  const onDownload = () => {
    downloadTriggered = true;
  };
  page.on("download", onDownload);

  try {
    await exportButton.click();
    await expect(page.getByTestId("pdf-editor-error")).toContainText(
      "PDF generation timed out. Please try again.",
      { timeout: 45_000 }
    );
    await expect(exportButton).toBeEnabled({ timeout: 5_000 });
    await expect(exportButton).toContainText("Save & Download");
    expect(downloadTriggered).toBe(false);
  } finally {
    page.off("download", onDownload);
  }
});
