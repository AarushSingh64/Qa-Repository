import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { LoginPage } from '../playwright/pages/LoginPage';
import { PasswordResetPage } from '../playwright/pages/PasswordResetPage';
import { YopmailHelper } from '../playwright/utils/YopmailHelper';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TENANT_EMAIL = process.env.TARGET_TENANT_EMAIL?.trim() || 'capitalpos-75690373@yopmail.com';

async function dumpYopmail(): Promise<void> {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage();
  const inboxId = YopmailHelper.extractInboxId(TENANT_EMAIL);

  await page.goto('https://yopmail.com/en/', { waitUntil: 'domcontentloaded' });
  await page.locator('#login').fill(inboxId);
  const checkInbox = page.locator('#refreshbut, button.sbut, .sbut');
  if (await checkInbox.first().isVisible().catch(() => false)) {
    await checkInbox.first().click();
  } else {
    await page.locator('#login').press('Enter');
  }
  await page.waitForTimeout(3_000);

  await page.screenshot({ path: 'test-results/yopmail-inbox-debug.png', fullPage: true });

  const frames = page.frames().map((frame) => frame.name() || frame.url());
  console.log('FRAMES:', frames);

  const inboxFrame = page.frameLocator('#ifinbox');
  const rows = inboxFrame.locator('.m, .lm, a');
  const count = await rows.count().catch(() => 0);
  console.log('INBOX_ROW_COUNT:', count);

  for (let index = 0; index < Math.min(count, 10); index += 1) {
    const text = ((await rows.nth(index).textContent()) ?? '').replace(/\s+/g, ' ').trim();
    console.log(`INBOX_${index}:`, text.slice(0, 200));
  }

  if (count > 0) {
    await rows.first().click();
    await page.waitForTimeout(1_500);
    const body = await page.frameLocator('#ifmail').locator('body').innerText();
    console.log('MAIL_BODY:', body.slice(0, 1500));
    await page.screenshot({ path: 'test-results/yopmail-mail-debug.png', fullPage: true });
  } else {
    const bodyText = await page.locator('body').innerText();
    console.log('PAGE_TEXT:', bodyText.slice(0, 1500));
  }

  await browser.close();
}

async function tryKnownPasswords(): Promise<void> {
  const baseURL = process.env.BASE_URL ?? 'https://stage.beanboutiques.supplyvalid.in';
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ baseURL, ignoreHTTPSErrors: true });
  const loginPage = new LoginPage(page);
  const candidates = ['Password@123', process.env.TENANT_PASSWORD?.trim()].filter(Boolean) as string[];

  for (const password of candidates) {
    console.log(`Trying login ${TENANT_EMAIL} / ${password}`);
    await loginPage.open();
    await loginPage.loginAsTenant(TENANT_EMAIL, password, { requireCaptchaSolution: false });
    await page.waitForTimeout(2_000);

    const reset = new PasswordResetPage(page);
    if (await reset.isVisible()) {
      console.log('Password reset screen shown — changing to Password@123');
      await reset.resetPassword({
        currentPassword: password,
        newPassword: 'Password@123',
      });
      await reset.expectPasswordResetComplete();
      console.log('DONE via known password + reset');
      await browser.close();
      return;
    }

    if (!(await loginPage.isOnLoginPage())) {
      console.log('Logged in successfully with known password (no reset required).');
      await page.screenshot({
        path: 'test-results/tenant-password-reset-success.png',
        fullPage: true,
      });
      await browser.close();
      return;
    }

    console.log('Login failed with this password.');
  }

  await page.screenshot({ path: 'test-results/tenant-login-failed.png', fullPage: true });
  await browser.close();
}

async function main(): Promise<void> {
  await dumpYopmail();
  await tryKnownPasswords();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
