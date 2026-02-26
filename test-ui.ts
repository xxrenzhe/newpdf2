import { chromium } from 'playwright';
import * as path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  
  await page.goto('http://localhost:3000/tools/edit', { timeout: 120000 });
  await page.locator('input[type="file"]').setInputFiles(path.resolve('public/2222.pdf'));
  
  console.log("File uploaded. Waiting 30s...");
  await page.waitForTimeout(30000);
  
  console.log("Taking timeout screenshot...");
  await page.screenshot({ path: 'screenshot-timeout.png', fullPage: true });

  await browser.close();
})();
