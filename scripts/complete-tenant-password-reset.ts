import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { LoginPage } from '../playwright/pages/LoginPage';
import { PasswordResetPage } from '../playwright/pages/PasswordResetPage';
import { YopmailHelper } from '../playwright/utils/YopmailHelper';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TENANT_EMAIL = 'capitalpos-75690373@yopmail.com';
const NEW_PASSWORD = 'Password@123';

async function main(): Promise<void> {
  const baseURL = process.env.BASE_URL ?? 'https://stage.beanboutiques.supplyvalid.in';
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 50,
  });
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  });

  try {
    const yopmailPage = await context.newPage();
    const yopmail = new YopmailHelper(yopmailPage);
    console.log(`Opening Yopmail for ${TENANT_EMAIL}...`);
    const tempPassword = await yopmail.waitForTemporaryPassword(TENANT_EMAIL, {
      timeoutMs: 60_000,
      pollIntervalMs: 3_000,
    });
    console.log(`Temporary password: ${tempPassword}`);
    await yopmailPage.close();

    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    const passwordResetPage = new PasswordResetPage(page);

    console.log('Logging into POS with temporary password...');
    await loginPage.open();
    await loginPage.loginAsTenant(TENANT_EMAIL, tempPassword, {
      requireCaptchaSolution: false,
    });
    await page.waitForTimeout(2_000);
    await page.screenshot({
      path: 'test-results/after-temp-login.png',
      fullPage: true,
    });

    if (await passwordResetPage.isVisible()) {
      console.log(`Changing password to ${NEW_PASSWORD}...`);
      await passwordResetPage.resetPassword({
        currentPassword: tempPassword,
        newPassword: NEW_PASSWORD,
      });
      await passwordResetPage.expectPasswordResetComplete();
      console.log('Password changed successfully.');
    } else if (await loginPage.isOnLoginPage()) {
      const errorText = await page
        .locator('.p-toast-message-text, [role="alert"], .p-error')
        .allTextContents();
      throw new Error(`Still on login page. Errors: ${errorText.join(' | ')}`);
    } else {
      console.log('Already logged in without reset screen.');
      await loginPage.expectLoggedIn();
    }

    // After reset the app returns to login — verify new password works.
    if (await loginPage.isOnLoginPage()) {
      console.log(`Verifying login with new password ${NEW_PASSWORD}...`);
      await loginPage.loginAsTenant(TENANT_EMAIL, NEW_PASSWORD, {
        requireCaptchaSolution: false,
      });
      await loginPage.expectLoggedIn();
      console.log('Login with new password succeeded.');
    }

    await page.screenshot({
      path: 'test-results/tenant-password-reset-success.png',
      fullPage: true,
    });
    console.log(`DONE. ${TENANT_EMAIL} password is now ${NEW_PASSWORD}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
