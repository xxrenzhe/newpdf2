import { expect, test } from "./fixtures";
import { makePdfBytes } from "./utils";

test("editor defaults to Text tool on load", async ({ page }) => {
  test.setTimeout(180_000);
  const pdfBytes = await makePdfBytes("default-text-tool", 1);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "default-text-tool.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frame = page.frameLocator('iframe[title="PDF Editor"]');
  await expect(frame.locator("#pdf-toolbar")).toBeVisible({ timeout: 120_000 });
  await expect(frame.locator(".tool_text.active")).toBeVisible({ timeout: 120_000 });
});
