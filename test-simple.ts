import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/2222.pdf', { timeout: 30000 });
  await page.screenshot({ path: 'simple.png' });
  console.log("Success");
  
  await browser.close();
})();
