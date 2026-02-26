import { chromium } from 'playwright';
import * as path from 'path';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch();
  console.log("Browser launched. Creating page...");
  const page = await browser.newPage();
  
  console.log("Navigating...");
  await page.goto('http://127.0.0.1:3000/tools/edit', { timeout: 120000 });
  console.log("Page loaded. Uploading file...");
  
  await page.locator('input[type="file"]').setInputFiles(path.resolve('public/2222.pdf'));
  
  console.log("File uploaded. Waiting for PDF Editor frame...");
  const frameLocator = page.frameLocator('iframe[title="PDF Editor"]');
  const firstPreview = frameLocator.locator("#pdf-main .__pdf_page_preview").first();
  await firstPreview.waitFor({ state: 'visible', timeout: 120000 });
  
  console.log("PDF loaded. Taking screenshot...");
  await page.screenshot({ path: 'editor-screenshot-1.png', fullPage: true });

  console.log("Done.");
  await browser.close();
})();
