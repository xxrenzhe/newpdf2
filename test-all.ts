import { chromium } from 'playwright';
import * as path from 'path';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.setViewportSize({ width: 1440, height: 900 });
  
  console.log("Navigating to PDF Editor...");
  await page.goto('http://localhost:3000/tools/edit', { timeout: 60000 });
  
  console.log("Uploading file...");
  await page.locator('input[type="file"]').setInputFiles(path.resolve('public/2222.pdf'));
  
  console.log("Waiting for PDF Editor iframe...");
  const frameLocator = page.frameLocator('iframe[title="PDF editor"]');
  const firstPreview = frameLocator.locator("#pdf-main .__pdf_page_preview").first();
  await firstPreview.waitFor({ state: 'visible', timeout: 30000 });
  console.log("PDF loaded successfully.");
  await browser.close();
})();
