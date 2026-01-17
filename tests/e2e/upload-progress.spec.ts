import { expect, test } from "playwright/test";
import { makePdfBytes } from "./utils";

test("edit tool shows upload progress overlay while loading PDF", async ({ page }) => {
  test.setTimeout(180_000);
  const pdfBytes = await makePdfBytes("upload-progress", 10);

  await page.route("**/pdfeditor/index.html", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "upload-progress.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const overlayHeading = page.getByRole("heading", { name: "Loading, please wait..." });
  await expect(overlayHeading).toBeVisible({ timeout: 30_000 });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });
  await expect(overlayHeading).toHaveCount(0, { timeout: 60_000 });
});

