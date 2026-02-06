import type { FrameLocator, Page } from "playwright/test";
import { expect, test } from "playwright/test";
import { expectPdfHeader, readDownloadBytes, repoPath, editorSaveDownloadButton, toolUploadBrowseButton } from "./utils";

const EDITOR_IFRAME_SELECTOR = 'iframe[src*="/pdfeditor/index.html"]';
const TEXT_BORDER_SELECTOR = "#pdf-main .textLayer .text-border";
const TEXT_ELEMENT_SELECTOR = "#pdf-main .__pdf_editor_element.__pdf_el_text";
const TEXT_EDITABLE_SELECTOR = '#pdf-main .__pdf_el_text [contenteditable="true"]';
const RECT_ELEMENT_SELECTOR = "#pdf-main .__pdf_editor_element.__pdf_el_rect";
const DRAW_LAYER_SELECTOR = "#pdf-main .drawLayer";

function overlapRatio(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const intersection = (x2 - x1) * (y2 - y1);
  const base = Math.max(1, Math.min(a.width * a.height, b.width * b.height));
  return intersection / base;
}

async function openEditorWithPublicPdf(page: Page, relativePdfPath: string) {
  await page.goto("/tools/edit");
  const browseButton = toolUploadBrowseButton(page);
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    browseButton.click(),
  ]);
  await fileChooser.setFiles(repoPath(relativePdfPath));

  const exportButton = editorSaveDownloadButton(page);
  await expect(exportButton).toBeEnabled({ timeout: 120_000 });

  const frameLocator = page.frameLocator(EDITOR_IFRAME_SELECTOR);
  await expect(frameLocator.locator("#pdf-main")).toBeAttached({ timeout: 120_000 });
  await expect(frameLocator.locator("#pdf-main .textLayer").first()).toBeAttached({ timeout: 120_000 });

  return { frameLocator, exportButton };
}

async function dragOnFirstDrawLayer(frameLocator: FrameLocator, from = { x: 0.2, y: 0.2 }, to = { x: 0.6, y: 0.45 }) {
  const drawLayer = frameLocator.locator(DRAW_LAYER_SELECTOR).first();
  await drawLayer.scrollIntoViewIfNeeded();

  const rect = await drawLayer.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  });

  const start = {
    x: rect.left + rect.width * from.x,
    y: rect.top + rect.height * from.y,
  };
  const end = {
    x: rect.left + rect.width * to.x,
    y: rect.top + rect.height * to.y,
  };

  const pointerPayload = { pointerId: 1, pointerType: "mouse", isPrimary: true };
  await drawLayer.dispatchEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    clientX: start.x,
    clientY: start.y,
    pageX: start.x,
    pageY: start.y,
    ...pointerPayload,
  });
  await drawLayer.dispatchEvent("pointermove", {
    bubbles: true,
    cancelable: true,
    buttons: 1,
    clientX: start.x + 5,
    clientY: start.y + 5,
    pageX: start.x + 5,
    pageY: start.y + 5,
    ...pointerPayload,
  });
  await drawLayer.dispatchEvent("pointermove", {
    bubbles: true,
    cancelable: true,
    buttons: 1,
    clientX: end.x,
    clientY: end.y,
    pageX: end.x,
    pageY: end.y,
    ...pointerPayload,
  });
  await drawLayer.dispatchEvent("pointerup", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 0,
    clientX: end.x,
    clientY: end.y,
    pageX: end.x,
    pageY: end.y,
    ...pointerPayload,
  });

  await drawLayer.dispatchEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    clientX: start.x,
    clientY: start.y,
    pageX: start.x,
    pageY: start.y,
  });
  await drawLayer.dispatchEvent("mousemove", {
    bubbles: true,
    cancelable: true,
    buttons: 1,
    clientX: end.x,
    clientY: end.y,
    pageX: end.x,
    pageY: end.y,
  });
  await drawLayer.dispatchEvent("mouseup", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 0,
    clientX: end.x,
    clientY: end.y,
    pageX: end.x,
    pageY: end.y,
  });
}

async function clickOnFirstDrawLayer(frameLocator: FrameLocator, xRatio: number, yRatio: number) {
  const drawLayer = frameLocator.locator(DRAW_LAYER_SELECTOR).first();
  await drawLayer.scrollIntoViewIfNeeded();

  const rect = await drawLayer.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  });

  const point = {
    x: rect.left + rect.width * xRatio,
    y: rect.top + rect.height * yRatio,
  };

  await drawLayer.dispatchEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    clientX: point.x,
    clientY: point.y,
    pageX: point.x,
    pageY: point.y,
  });
  await drawLayer.dispatchEvent("mouseup", {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 0,
    clientX: point.x,
    clientY: point.y,
    pageX: point.x,
    pageY: point.y,
  });
}

test("public/document.pdf: editable text boundary + add/modify/delete + original cover", async ({ page }) => {
  test.setTimeout(300_000);
  const { frameLocator, exportButton } = await openEditorWithPublicPdf(page, "public/document.pdf");

  const borders = frameLocator.locator(TEXT_BORDER_SELECTOR);
  await expect.poll(async () => borders.count()).toBeGreaterThan(20);

  const firstBorder = borders.first();
  await firstBorder.scrollIntoViewIfNeeded();
  const borderBox = await firstBorder.boundingBox();
  expect(borderBox).not.toBeNull();
  if (!borderBox) throw new Error("Missing text border box");

  await firstBorder.dispatchEvent("click");
  const editable = frameLocator.locator(TEXT_EDITABLE_SELECTOR).last();
  await expect(editable).toBeVisible({ timeout: 120_000 });

  const convertedBox = await editable.boundingBox();
  expect(convertedBox).not.toBeNull();
  if (!convertedBox) throw new Error("Missing converted editable box");

  const boundaryOverlap = overlapRatio(borderBox, convertedBox);
  expect(boundaryOverlap).toBeGreaterThan(0.05);

  await editable.click();
  await editable.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await editable.type("PUBLIC_DOC_EDITED_TEXT");
  await expect(editable).toContainText("PUBLIC_DOC_EDITED_TEXT");

  const textElements = frameLocator.locator(TEXT_ELEMENT_SELECTOR);
  const textCountBeforeRemove = await textElements.count();
  const removeButton = textElements.last().locator(".__act_remove").first();
  await expect(removeButton).toBeVisible({ timeout: 120_000 });
  await removeButton.dispatchEvent("click");

  await expect
    .poll(async () => {
      const count = await textElements.count();
      const hiddenCount = await frameLocator.locator(`${TEXT_ELEMENT_SELECTOR}.__pdf_el_hidden`).count();
      return count < textCountBeforeRemove || hiddenCount > 0;
    })
    .toBeTruthy();

  await frameLocator.locator("#tool_text").click();
  const editableCountBeforeAdd = await frameLocator.locator(TEXT_EDITABLE_SELECTOR).count();
  await clickOnFirstDrawLayer(frameLocator, 0.35, 0.35);
  await expect.poll(async () => frameLocator.locator(TEXT_EDITABLE_SELECTOR).count()).toBeGreaterThan(editableCountBeforeAdd);

  const addedEditable = frameLocator.locator(TEXT_EDITABLE_SELECTOR).last();
  await addedEditable.evaluate((el) => {
    el.textContent = "PUBLIC_DOC_ADDED_TEXT";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(addedEditable).toContainText("PUBLIC_DOC_ADDED_TEXT");
  await frameLocator.locator("#pdf-toolbar").click({ position: { x: 8, y: 8 } });

  await expect(exportButton).toBeEnabled();
});

test("public/document-vertical.pdf: vertical text detect + edit + delete", async ({ page }) => {
  test.setTimeout(300_000);
  const { frameLocator, exportButton } = await openEditorWithPublicPdf(page, "public/document-vertical.pdf");

  const borders = frameLocator.locator(TEXT_BORDER_SELECTOR);
  await expect.poll(async () => borders.count()).toBeGreaterThan(3);

  const verticalBorder = frameLocator
    .locator(TEXT_BORDER_SELECTOR)
    .filter({ hasText: "VERTICAL_SAMPLE_ALPHA" })
    .first();
  await expect(verticalBorder).toBeVisible({ timeout: 120_000 });
  await verticalBorder.dispatchEvent("click");

  const editable = frameLocator.locator(TEXT_EDITABLE_SELECTOR).last();
  await expect(editable).toBeVisible({ timeout: 120_000 });

  const transform = await editable.evaluate((el) => (el as HTMLElement).style.transform || "");
  expect(transform).toContain("rotate(");

  await editable.evaluate((el) => {
    el.textContent = "VERTICAL_EDITED";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(editable).toContainText("VERTICAL_EDITED");

  const textElements = frameLocator.locator(TEXT_ELEMENT_SELECTOR);
  const textCountBeforeRemove = await textElements.count();
  const removeButton = textElements.last().locator(".__act_remove").first();
  await expect(removeButton).toBeVisible({ timeout: 120_000 });
  await removeButton.dispatchEvent("click");

  await expect
    .poll(async () => {
      const count = await textElements.count();
      const hiddenCount = await frameLocator.locator(`${TEXT_ELEMENT_SELECTOR}.__pdf_el_hidden`).count();
      return count < textCountBeforeRemove || hiddenCount > 0;
    })
    .toBeTruthy();

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  const outBytes = await readDownloadBytes(download);
  expectPdfHeader(outBytes);
});


test("public/document.pdf: eraser creates cover rect", async ({ page }) => {
  test.setTimeout(300_000);
  const { frameLocator, exportButton } = await openEditorWithPublicPdf(page, "public/document.pdf");

  const borders = frameLocator.locator(TEXT_BORDER_SELECTOR);
  await expect.poll(async () => borders.count()).toBeGreaterThan(20);

  const rects = frameLocator.locator(RECT_ELEMENT_SELECTOR);
  const before = await rects.count();

  await frameLocator.locator("#tool_eraser").click();
  await dragOnFirstDrawLayer(frameLocator, { x: 0.15, y: 0.15 }, { x: 0.5, y: 0.32 });

  await expect.poll(async () => rects.count()).toBeGreaterThan(before);
  await expect(exportButton).toBeEnabled();
});
