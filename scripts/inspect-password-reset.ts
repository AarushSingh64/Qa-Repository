import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { LoginPage } from '../playwright/pages/LoginPage';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main(): Promise<void> {
  const baseURL = process.env.BASE_URL ?? 'https://stage.beanboutiques.supplyvalid.in';
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const page = await browser.newPage({ baseURL, ignoreHTTPSErrors: true });
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.loginAsTenant('capitalpos-75690373@yopmail.com', 'o@99y@$FUx7R');
  await page.waitForTimeout(3_000);

  const snapshot = await page.locator('body').innerText();
  console.log('PAGE_TEXT:\n', snapshot.slice(0, 2500));

  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input')).map((input) => ({
      type: input.type,
      name: input.name,
      placeholder: input.placeholder,
      id: input.id,
      ariaLabel: input.getAttribute('aria-label'),
      value: input.value,
      disabled: input.disabled,
    })),
  );
  console.log('INPUTS:', JSON.stringify(inputs, null, 2));

  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map((button) => ({
      text: button.textContent?.trim(),
      disabled: button.disabled,
      type: button.type,
    })),
  );
  console.log('BUTTONS:', JSON.stringify(buttons, null, 2));

  await page.screenshot({ path: 'test-results/password-reset-form.png', fullPage: true });
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
