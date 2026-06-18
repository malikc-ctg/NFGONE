const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/customer-site/login');
  
  console.log('Logging in...');
  await page.fill('input[type="email"]', 'test_customer_1781752798168@example.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for navigation to dashboard...');
  await page.waitForURL('http://localhost:3000/customer-site/portal', { timeout: 10000 });
  
  console.log('Checking for Home Profile Widget...');
  const homeProfile = await page.locator('text=Home Profile').count();
  console.log('Home Profile Widget count:', homeProfile);
  
  console.log('Checking for Referral Widget...');
  const referral = await page.locator('text=Give $50, Get $50').count();
  console.log('Referral Widget count:', referral);
  
  console.log('Checking for Billing Page link...');
  const billingButton = await page.locator('text=My Invoices').first();
  await billingButton.click();
  
  console.log('Waiting for navigation to billing...');
  await page.waitForURL('http://localhost:3000/customer-site/portal/billing', { timeout: 10000 });
  console.log('Successfully navigated to billing page!');
  
  await browser.close();
  console.log('TEST PASSED SUCCESSFULLY!');
})().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
