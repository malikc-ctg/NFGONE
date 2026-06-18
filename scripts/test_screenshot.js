const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/customer-site/login');
  await page.fill('input[type="email"]', 'test_customer_1781752798168@example.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('http://localhost:3000/customer-site/portal', { timeout: 10000 });
  await page.waitForTimeout(2000); // wait for load
  
  await page.screenshot({ path: '/Users/malikcampbell/.gemini/antigravity-ide/brain/c43e33e4-bad4-48fd-b551-5f68c8fa5598/e2e_flow_test_1781663742496.webp' });
  
  console.log('Saved screenshot!');
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
