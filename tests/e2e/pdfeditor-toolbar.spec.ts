import { expect, test } from "./fixtures";
import type { Frame, FrameLocator, Page } from "playwright/test";
import { loadPdfPageCount, makePdfBytes, readDownloadBytes, repoPath } from "./utils";

async function openEditor(page: Page, pdfBytes: Uint8Array, filename: string) {
  await page.goto("/tools/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  const exportButton = page.getByRole("button", { name: "Save & Download" });
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frameLocator = page.frameLocator('iframe[title="PDF Editor"]');
  const firstPreview = frameLocator.locator("#pdf-main .__pdf_page_preview").first();
  await expect(firstPreview).toBeVisible({ timeout: 120_000 });
  await firstPreview.scrollIntoViewIfNeeded();

  const frame = page.frame({ url: /\/pdfeditor\/index\.html/ }) as Frame | null;
  if (!frame) throw new Error("Missing pdfeditor iframe");

  return { frame, frameLocator, exportButton };
}

async function dragOnFirstPage(page: Page, frameLocator: FrameLocator) {
  const drawLayer = frameLocator.locator("#pdf-main .drawLayer").first();
  await drawLayer.scrollIntoViewIfNeeded();
  const rect = await drawLayer.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  });
  if (!rect.width || !rect.height) throw new Error("Missing PDF draw layer size");

  const start = { x: rect.left + rect.width * 0.2, y: rect.top + rect.height * 0.25 };
  const end = { x: rect.left + rect.width * 0.55, y: rect.top + rect.height * 0.4 };

  await drawLayer.dispatchEvent("mousedown", { bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: start.x, clientY: start.y });
  await drawLayer.dispatchEvent("mousemove", { bubbles: true, cancelable: true, buttons: 1, clientX: start.x + 5, clientY: start.y + 5 });
  await drawLayer.dispatchEvent("mousemove", { bubbles: true, cancelable: true, buttons: 1, clientX: end.x, clientY: end.y });
  await drawLayer.dispatchEvent("mouseup", { bubbles: true, cancelable: true, button: 0, buttons: 0, clientX: end.x, clientY: end.y });
}

async function clickOnFirstPage(frameLocator: FrameLocator, xRatio = 0.3, yRatio = 0.3) {
  const drawLayer = frameLocator.locator("#pdf-main .drawLayer").first();
  await drawLayer.scrollIntoViewIfNeeded();
  const rect = await drawLayer.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  });
  if (!rect.width || !rect.height) throw new Error("Missing PDF draw layer size");

  const point = { x: rect.left + rect.width * xRatio, y: rect.top + rect.height * yRatio };
  await drawLayer.dispatchEvent("mousedown", { bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: point.x, clientY: point.y });
  await drawLayer.dispatchEvent("mouseup", { bubbles: true, cancelable: true, button: 0, buttons: 0, clientX: point.x, clientY: point.y });
}

async function openMoreDropdown(frameLocator: FrameLocator) {
  await frameLocator.locator("#tool_more").click();
  await expect(frameLocator.locator("#more_dropdown")).toBeVisible();
}

test("pdfeditor toolbar: draw tool adds a stroke", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-draw", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-draw.pdf");

  const images = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_image");
  const before = await images.count();

  await frameLocator.locator("#tool_draw").click();
  await dragOnFirstPage(page, frameLocator);

  await expect.poll(async () => images.count()).toBeGreaterThan(before);
});

test("pdfeditor toolbar: highlight and eraser create overlay rects", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-highlight", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-highlight.pdf");

  const rects = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_rect");
  const before = await rects.count();

  await frameLocator.locator("#tool_highlight").click();
  await dragOnFirstPage(page, frameLocator);
  await expect.poll(async () => rects.count()).toBeGreaterThan(before);

  const afterHighlight = await rects.count();
  await frameLocator.locator("#tool_eraser").click();
  await dragOnFirstPage(page, frameLocator);
  await expect.poll(async () => rects.count()).toBeGreaterThan(afterHighlight);
});

test("pdfeditor toolbar: highlight text, underline, and strikethrough apply to selected text", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-text-marks", 1);
  const { frame, frameLocator } = await openEditor(page, pdfBytes, "toolbar-text-marks.pdf");

  const expectMarkup = async (type: "highlight" | "underline" | "strikethrough") => {
    const markup = frameLocator.locator(`.__pdf_text_markup_${type}`).first();
    await expect(markup).toBeVisible({ timeout: 10_000 });
  };

  const selectFirstText = async () => {
    await frame.evaluate(() => {
      const el = document.querySelector("#pdf-main .textLayer .text-border");
      if (!el) throw new Error("Missing PDF text layer element");
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      if (!sel) throw new Error("Missing window selection");
      sel.removeAllRanges();
      sel.addRange(range);
    });
  };

  await frameLocator.locator("#tool_text_highlight").click();
  await selectFirstText();
  await frame.evaluate(() => document.querySelector("#pdf-main")?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })));
  await expectMarkup("highlight");

  await frameLocator.locator("#tool_underline").click();
  await selectFirstText();
  await frame.evaluate(() => document.querySelector("#pdf-main")?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })));
  await expectMarkup("underline");

  await frameLocator.locator("#tool_strikethrough").click();
  await selectFirstText();
  await frame.evaluate(() => document.querySelector("#pdf-main")?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })));
  await expectMarkup("strikethrough");
});

test("pdfeditor toolbar: image tool can place an image", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-image", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-image.pdf");

  const images = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_image");
  const before = await images.count();

  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), frameLocator.locator("#tool_image").click()]);
  await chooser.setFiles(repoPath("public/pdfeditor/assets/img/approved.png"));

  await frameLocator.locator("#pdf-main .__pdf_page_preview").first().click({ position: { x: 180, y: 180 } });
  await expect.poll(async () => images.count()).toBeGreaterThan(before);
});

test("pdfeditor toolbar: shapes tool can draw a rectangle stroke", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-shapes", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-shapes.pdf");

  const rects = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_rect");
  const before = await rects.count();

  await frameLocator.locator("#tool_shapes").click();
  await expect(frameLocator.locator("#pdf-el-actions")).toBeVisible();
  await expect(frameLocator.locator("#pdf-el-actions .draw_rect")).toBeVisible();
  await frameLocator.locator("#pdf-el-actions .draw_rect").click();
  await dragOnFirstPage(page, frameLocator);

  await expect.poll(async () => rects.count()).toBeGreaterThan(before);
});

test("pdfeditor toolbar: textbox tool creates a textbox", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-textbox", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-textbox.pdf");

  await frameLocator.locator("#tool_textbox").click();
  await dragOnFirstPage(page, frameLocator);

  await expect(frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_textbox").first()).toBeVisible();
  await expect(frameLocator.locator('#pdf-main .__pdf_el_textbox [contenteditable="true"]').first()).toBeVisible();
});

test("pdfeditor toolbar: signature tool can add a signature", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-signature", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-signature.pdf");

  const images = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_image");
  const before = await images.count();

  await frameLocator.locator("#tool_signature").click();

  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(1);
  await frameLocator.locator("#btn-sign-ok").click();
  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(0);

  await frameLocator.locator("#pdf-main .__pdf_page_preview").first().click({ position: { x: 220, y: 220 } });
  await expect.poll(async () => images.count()).toBeGreaterThan(before);
});

test("pdfeditor toolbar: forms tool can place a checkbox", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-forms", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-forms.pdf");

  const checkboxes = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_checkbox");
  const before = await checkboxes.count();

  await frameLocator.locator("#tool_forms").click();
  await expect(frameLocator.locator("#forms_wrapper")).toBeVisible();
  await frameLocator.locator("#forms_wrapper .forms_checkbox").first().click();

  await frameLocator.locator("#pdf-main .__pdf_page_preview").first().click({ position: { x: 120, y: 240 } });
  await expect.poll(async () => checkboxes.count()).toBeGreaterThan(before);
});

test("pdfeditor toolbar: delete pages removes a page and export reflects it", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-delete-pages", 2);
  const { frameLocator, exportButton } = await openEditor(page, pdfBytes, "toolbar-delete-pages.pdf");

  await frameLocator.locator("#tool_delete_pages").click();
  await expect(frameLocator.locator("#pdf-main.view_page_2")).toBeVisible();

  await frameLocator.locator('#pdf-main .__pdf_page_preview[data-page="2"] .remove_page').first().click();
  await expect(frameLocator.locator('.__pdf_page_preview[data-page="2"]')).toHaveCount(0, { timeout: 120_000 });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  const outBytes = await readDownloadBytes(download);
  await expect.poll(() => loadPdfPageCount(outBytes)).toBe(1);
});

test("pdfeditor toolbar: inserted page shows as thumbnail in delete mode and can be removed", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-insert-delete", 1);
  const { frameLocator, exportButton } = await openEditor(page, pdfBytes, "toolbar-insert-delete.pdf");

  await frameLocator.locator("#tool_insert_pages").click();
  await frameLocator.getByRole("button", { name: "OK" }).click();

  const newPage = frameLocator.locator('#pdf-main .__pdf_page_preview[data-page="2"]');
  await expect(newPage).toBeVisible({ timeout: 120_000 });

  await frameLocator.locator("#tool_delete_pages").click();
  await expect(frameLocator.locator("#pdf-main.view_page_2")).toBeVisible();

  const page1 = frameLocator.locator('#pdf-main .__pdf_page_preview[data-page="1"]');
  await expect(page1).toBeVisible();
  await expect(newPage).toBeVisible();

  const page1Width = await page1.evaluate((el) => el.getBoundingClientRect().width);
  const page2Width = await newPage.evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(page1Width - page2Width)).toBeLessThan(20);

  await newPage.locator(".remove_page").click();
  await expect(newPage).toHaveCount(0, { timeout: 120_000 });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  const outBytes = await readDownloadBytes(download);
  await expect.poll(() => loadPdfPageCount(outBytes)).toBe(1);
});

test("pdfeditor toolbar: watermark can add text watermark", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-watermark", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-watermark.pdf");

  const textCanvas = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_textCanvas");
  const before = await textCanvas.count();

  await openMoreDropdown(frameLocator);
  await frameLocator.locator('#more_dropdown [data-tool="watermark"]').click();
  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(1);
  await frameLocator.locator(".__dialog.__dialog_open #watermark_text").fill("WM");
  await frameLocator.locator(".__dialog.__dialog_open .btn-ok").click();
  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(0);

  await expect.poll(async () => textCanvas.count()).toBeGreaterThan(before);
});

test("pdfeditor toolbar: page number and header/footer can apply elements", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-page-number", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-page-number.pdf");

  await openMoreDropdown(frameLocator);
  await frameLocator.locator('#more_dropdown [data-tool="page_number"]').click();
  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(1);
  await frameLocator.locator(".__dialog.__dialog_open .btn_ok").click();
  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(0);
  await expect(frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_text").first()).toBeVisible();

  await openMoreDropdown(frameLocator);
  await frameLocator.locator('#more_dropdown [data-tool="header_footer"]').click();
  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(1);
  await frameLocator.locator(".__dialog.__dialog_open .btn_ok").click();
  await expect(frameLocator.locator(".__dialog.__dialog_open")).toHaveCount(0);
  await expect(frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_textCanvas").first()).toBeVisible();
});

test("pdfeditor toolbar: stamp preset and text art can be placed", async ({ page }) => {
  test.setTimeout(240_000);
  const pdfBytes = await makePdfBytes("toolbar-stamp-textart", 1);
  const { frameLocator } = await openEditor(page, pdfBytes, "toolbar-stamp-textart.pdf");

  const images = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_image");
  const beforeImages = await images.count();

  await openMoreDropdown(frameLocator);
  await frameLocator.locator('#more_dropdown [data-tool="seal"]').click();
  await expect(frameLocator.locator("#dropdown_stamp")).toBeVisible();
  await frameLocator.locator("#dropdown_stamp .preset_item").first().click();
  await clickOnFirstPage(frameLocator, 0.25, 0.25);
  await expect.poll(async () => images.count()).toBeGreaterThan(beforeImages);

  const textArt = frameLocator.locator("#pdf-main .__pdf_editor_element.__pdf_el_textArt");
  const beforeTextArt = await textArt.count();
  await openMoreDropdown(frameLocator);
  await frameLocator.locator('#more_dropdown [data-tool="textArt"]').click();
  await expect(frameLocator.locator("#dropdown_textArt")).toBeVisible();
  await frameLocator.locator("#dropdown_textArt .text_art").first().click();
  await clickOnFirstPage(frameLocator, 0.4, 0.22);
  await expect.poll(async () => textArt.count()).toBeGreaterThan(beforeTextArt);
});
