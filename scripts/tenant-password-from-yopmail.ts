import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { LoginPage } from '../playwright/pages/LoginPage';
import { PasswordResetPage } from '../playwright/pages/PasswordResetPage';
import { TenantPage } from '../playwright/pages/TenantPage';
import { YopmailHelper } from '../playwright/utils/YopmailHelper';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const NEW_PASSWORD = 'Password@123';
const BRAND_HINT = process.env.TENANT_BRAND_HINT?.trim() || 'WEFIT';

async function findTenantEmail(page: import('playwright').Page): Promise<string> {
  const envEmail = process.env.TENANT_EMAIL?.trim();
  const tenantPage = new TenantPage(page);
  await tenantPage.open();
  await page.waitForTimeout(1_500);

  const search = page.getByPlaceholder(/search/i);
  if (await search.first().isVisible().catch(() => false)) {
    await search.first().fill(BRAND_HINT);
    await page.waitForTimeout(1_500);
  }

  const rows = page.locator('table tbody tr, .p-datatable-tbody tr');
  const rowCount = await rows.count();
  console.log(`Tenant rows visible: ${rowCount}`);

  for (let index = 0; index < rowCount; index += 1) {
    const text = (await rows.nth(index).innerText()).replace(/\s+/g, ' ').trim();
    console.log(`Row ${index}: ${text.slice(0, 180)}`);
    if (!new RegExp(BRAND_HINT, 'i').test(text)) {
      continue;
    }

    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/i);
    if (emailMatch) {
      console.log(`Found tenant email from list (${BRAND_HINT}): ${emailMatch[0]}`);
      return emailMatch[0];
    }
  }

  // Prefer a recent automation email if present on the page.
  const pageText = await page.locator('body').innerText();
  const capitalEmails = pageText.match(/capitalpos-[\w.-]+@yopmail\.com/gi) ?? [];
  if (capitalEmails.length > 0) {
    console.log(`Using latest capitalpos email from tenant list: ${capitalEmails[0]}`);
    return capitalEmails[0];
  }

  if (envEmail) {
    console.log(`Using TENANT_EMAIL from .env: ${envEmail}`);
    return envEmail;
  }

  throw new Error(
    `Could not find tenant email. Set TENANT_EMAIL in .env or ensure a tenant matching "${BRAND_HINT}" exists.`,
  );
}

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
  const page = await context.newPage();

  try {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsSuperAdmin();
    await loginPage.expectLoggedIn();

    const tenantEmail = await findTenantEmail(page);
    console.log(`Tenant email: ${tenantEmail}`);

    const yopmailPage = await context.newPage();
    const yopmail = new YopmailHelper(yopmailPage);
    console.log('Opening Yopmail and searching for temporary password...');
    const tempPassword = await yopmail.waitForTemporaryPassword(tenantEmail, {
      timeoutMs: 120_000,
      pollIntervalMs: 5_000,
    });
    console.log(`Temporary password found: ${tempPassword}`);
    await yopmailPage.screenshot({
      path: 'test-results/yopmail-temp-password.png',
      fullPage: true,
    });
    await yopmailPage.close();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    if (!(await loginPage.isOnLoginPage())) {
      await loginPage.logout();
    }

    console.log('Logging into POS with temporary password...');
    await loginPage.open();
    await loginPage.loginAsTenant(tenantEmail, tempPassword, {
      requireCaptchaSolution: false,
    });

    const passwordResetPage = new PasswordResetPage(page);
    await page.waitForTimeout(2_000);
    const needsReset = await passwordResetPage.isVisible();

    if (needsReset) {
      console.log(`Changing password to ${NEW_PASSWORD}...`);
      await passwordResetPage.resetPassword({
        currentPassword: tempPassword,
        newPassword: NEW_PASSWORD,
      });
      await passwordResetPage.expectPasswordResetComplete();
      console.log('Password changed successfully.');
    } else if (await loginPage.isOnLoginPage()) {
      await page.screenshot({
        path: 'test-results/tenant-login-failed.png',
        fullPage: true,
      });
      throw new Error(
        `Tenant login failed for ${tenantEmail}. Still on login page after temp password.`,
      );
    } else {
      console.log('Password reset screen not shown — tenant appears already logged in.');
      await loginPage.expectLoggedIn();
    }

    await page.screenshot({
      path: 'test-results/tenant-password-reset-success.png',
      fullPage: true,
    });
    console.log(`DONE. Tenant ${tenantEmail} password is now ${NEW_PASSWORD}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
