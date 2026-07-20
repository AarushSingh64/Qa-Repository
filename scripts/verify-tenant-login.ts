import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { LoginPage } from '../playwright/pages/LoginPage';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TENANT_EMAIL = 'capitalpos-75690373@yopmail.com';
const PASSWORD = 'Password@123';

async function main(): Promise<void> {
  const baseURL = process.env.BASE_URL ?? 'https://stage.beanboutiques.supplyvalid.in';
  const browser = await chromium.launch({ headless: false, channel: 'chrome', slowMo: 50 });
  const page = await browser.newPage({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  });

  try {
    const loginPage = new LoginPage(page);
    console.log(`Logging in as ${TENANT_EMAIL} with ${PASSWORD}...`);
    await loginPage.open();
    await loginPage.loginAsTenant(TENANT_EMAIL, PASSWORD, { requireCaptchaSolution: false });
    await page.waitForTimeout(2_000);

    if (await loginPage.isOnLoginPage()) {
      const errors = await page
        .locator('.p-toast-message-text, [role="alert"], .p-error')
        .allTextContents();
      throw new Error(`Login failed: ${errors.join(' | ')}`);
    }

    await loginPage.expectLoggedIn();
    await page.screenshot({
      path: 'test-results/tenant-password-reset-success.png',
      fullPage: true,
    });
    console.log(`DONE. Tenant ${TENANT_EMAIL} is logged in with ${PASSWORD}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
