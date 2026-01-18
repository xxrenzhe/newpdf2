import fs from "node:fs";
import { expect, test } from "./fixtures";
import { TOOLS } from "../../src/lib/tools";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function makePdfBytes(label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(`Playwright fixture: ${label}`, { x: 50, y: 780, size: 24, font, color: rgb(0, 0, 0) });
  return doc.save();
}

test("static pages render", async ({ page }) => {
  const routes = [
    "/",
    "/plan",
    "/faq",
    "/contact-us",
    "/privacy-policy",
    "/terms-and-conditions",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/unsubscribe",
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("Application error")).toHaveCount(0);
  }
});

test('home "Browse files" opens file chooser', async ({ page }) => {
  test.setTimeout(120_000);
  const pdfBytes = await makePdfBytes("home-upload");

  await page.goto("/");
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Browse files" }).click(),
  ]);

  await chooser.setFiles({
    name: "home.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  await expect(page).toHaveURL(/\/app\/guest\/document\?chosenTool=edit-pdf&documentId=/);
  await expect(page.getByRole("button", { name: "Save & Download" })).toBeVisible({ timeout: 30_000 });
});

test("pdf editor converts PDF text into editable element", async ({ page }) => {
  test.setTimeout(120_000);
  const pdfBytes = await makePdfBytes("convert-widget");

  const pageErrors: Error[] = [];
  page.on("pageerror", (err) => pageErrors.push(err));

  await page.goto("/");
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Browse files" }).click(),
  ]);

  await chooser.setFiles({
    name: "convert-widget.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });

  await expect(page.getByRole("button", { name: "Save & Download" })).toBeVisible({ timeout: 30_000 });

  const editorFrame = page.frameLocator('iframe[title="PDF Editor"]');
  const firstTextDiv = editorFrame.locator(".text-border").first();
  await expect(firstTextDiv).toBeVisible({ timeout: 30_000 });

  await firstTextDiv.click({ force: true });
  await expect(editorFrame.locator(".__pdf_editor_element").first()).toBeVisible({ timeout: 30_000 });

  expect(pageErrors.map((err) => err.message).join("\n")).not.toContain("querySelector");
});

test("watermark tool downloads a PDF", async ({ page }) => {
  test.setTimeout(120_000);
  const pdfBytes = await makePdfBytes("watermark");

  await page.goto("/tools/watermark");
  await page.locator('input[type="file"]').setInputFiles({
    name: "watermark.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdfBytes),
  });
  await expect(page.getByRole("button", { name: "Apply & Download" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Apply & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-watermarked\.pdf$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = fs.readFileSync(downloadPath!);
  expect(bytes.subarray(0, 4).toString("utf8")).toBe("%PDF");
});

test("merge tool downloads a PDF", async ({ page }) => {
  test.setTimeout(120_000);
  const pdf1Bytes = await makePdfBytes("merge-a");
  const pdf2Bytes = await makePdfBytes("merge-b");

  await page.goto("/tools/merge");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf1Bytes) },
    { name: "b.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdf2Bytes) },
  ]);
  await expect(page.getByRole("button", { name: "Merge & Download" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Merge & Download" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("merged.pdf");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const bytes = fs.readFileSync(downloadPath!);
  expect(bytes.subarray(0, 4).toString("utf8")).toBe("%PDF");
});

for (const tool of TOOLS) {
  test(`home tool card works: ${tool.key}`, async ({ page }) => {
    test.setTimeout(120_000);
    const pdfBytes = await makePdfBytes(`home-${tool.key}`);

    await page.goto("/");
    const toolsSection = page.locator("#tools");
    await toolsSection.scrollIntoViewIfNeeded();

    const card = toolsSection.locator("a.tool-card", { hasText: tool.name }).first();
    await expect(card).toBeVisible();

    const toolUrl = new RegExp(`${escapeRegExp(tool.href)}(\\?.*)?$`);
    await Promise.all([page.waitForURL(toolUrl), card.click()]);
    await expect(page.getByRole("heading", { name: tool.name })).toBeVisible();

    const fileInput = page.locator('main input[type="file"]').first();
    if (tool.key === "merge") {
      await fileInput.setInputFiles([
        { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfBytes) },
        { name: "b.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfBytes) },
      ]);
    } else {
      await fileInput.setInputFiles({ name: `${tool.key}.pdf`, mimeType: "application/pdf", buffer: Buffer.from(pdfBytes) });
    }

    if (tool.key === "password") {
      await page.getByPlaceholder("Enter password...").fill("Abc123!!");
      await page.getByPlaceholder("Confirm password...").fill("Abc123!!");
    }

    if (tool.key === "annotate" || tool.key === "edit") {
      await expect(page.getByRole("button", { name: "Save & Download" })).toBeVisible({ timeout: 30_000 });
      return;
    }

    if (tool.key === "organize" || tool.key === "rotate" || tool.key === "delete") {
      await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled({ timeout: 20_000 });
      return;
    }

    const primaryActionName: Record<string, string> = {
      sign: "Apply Signature & Download",
      compress: "Compress & Download",
      merge: "Merge & Download",
      convert: "Convert & Download",
      split: "Extract & Download",
      watermark: "Apply & Download",
      password: "Protect & Download",
      unlock: "Unlock & Download",
      crop: "Crop & Download",
      redact: "Export redacted PDF",
    };

    const expected = primaryActionName[tool.key];
    if (!expected) throw new Error(`Missing primary action assertion for tool: ${tool.key}`);
    await expect(page.getByRole("button", { name: expected })).toBeEnabled({ timeout: 20_000 });
  });
}
