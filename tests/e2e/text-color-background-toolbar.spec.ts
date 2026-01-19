import { expect, test } from "./fixtures";
import { makePdfBytes } from "./utils";

async function getEditableStyles(locator: import("playwright/test").Locator) {
  return locator.evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
}

test("text element toolbar keeps font color and background color actions distinct", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("text-color-background-toolbar", 1);

  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "text-color-background-toolbar.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frame = page.frameLocator('iframe[title="PDF Editor"]');
  const firstText = frame.locator("#pdf-main .textLayer .text-border").first();
  await expect(firstText).toBeVisible({ timeout: 120_000 });
  await firstText.click();

  const textElement = frame.locator("#pdf-main .__pdf_el_text").first();
  const editable = textElement.locator('[contenteditable="true"]').first();
  await expect(editable).toBeVisible({ timeout: 120_000 });

  const initial = await getEditableStyles(editable);

  const fontColorArrow = textElement.locator(".font_color .arrow").first();
  await fontColorArrow.click();

  const fontColorPicker = frame.locator(".pcr-app.visible").first();
  await expect(fontColorPicker).toBeVisible({ timeout: 10_000 });
  await fontColorPicker.locator(".pcr-swatches button").first().click(); // red

  await expect
    .poll(async () => getEditableStyles(editable), { timeout: 10_000 })
    .toMatchObject({ color: "rgb(255, 0, 0)", backgroundColor: initial.backgroundColor });

  // Close the picker so it doesn't cover the next toolbar control.
  await page.keyboard.press("Escape");
  await expect(frame.locator(".pcr-app.visible")).toHaveCount(0, { timeout: 10_000 });

  await editable.click();
  await textElement.hover();
  const bgColorArrow = textElement.locator(".font_bg .arrow").first();
  await bgColorArrow.click();

  const bgColorPicker = frame.locator(".pcr-app.visible").first();
  await expect(bgColorPicker).toBeVisible({ timeout: 10_000 });
  await bgColorPicker.locator(".pcr-swatches button").nth(3).click(); // #00e100

  await expect
    .poll(async () => getEditableStyles(editable), { timeout: 10_000 })
    .toMatchObject({ color: "rgb(255, 0, 0)", backgroundColor: "rgb(0, 225, 0)" });
});
