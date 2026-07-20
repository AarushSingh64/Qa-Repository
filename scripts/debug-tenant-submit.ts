import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { buildTenantData } from '../playwright/data/tenantData';
import { LoginPage } from '../playwright/pages/LoginPage';
import { TenantPage } from '../playwright/pages/TenantPage';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main(): Promise<void> {
  const baseURL = process.env.BASE_URL ?? 'https://stage.beanboutiques.supplyvalid.in';
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ baseURL });
  const responses: string[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (!/tenant|brand|organisation|organization|api/i.test(url)) {
      return;
    }

    const body = await response.text().catch(() => '');
    responses.push(
      `${response.request().method()} ${response.status()} ${url}\n${body.slice(0, 1200)}`,
    );
  });

  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsSuperAdmin();
  await loginPage.expectLoggedIn();

  const tenantPage = new TenantPage(page);
  const tenantData = buildTenantData();

  await tenantPage.open();
  await tenantPage.startCreateTenant();
  await tenantPage.fillTenantForm(tenantData);
  const postRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') {
      postRequests.push(request.url());
    }
  });

  const buttons = page.getByRole('button', { name: /^create tenant$/i });
  console.log('CREATE_BUTTON_COUNT:', await buttons.count());
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index);
    console.log(`BUTTON_${index}:`, {
      visible: await button.isVisible(),
      enabled: await button.isEnabled(),
      box: await button.boundingBox(),
    });
  }

  const createButton = buttons.last();
  await createButton.scrollIntoViewIfNeeded();
  await createButton.click();
  await page.waitForTimeout(1_000);

  if (!postRequests.some((url) => /tenant/i.test(url) && !/getAll|getLoggedIn/i.test(url))) {
    console.log('Retry submit via keyboard');
    await createButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1_000);
  }

  if (!postRequests.some((url) => /tenant/i.test(url) && !/getAll|getLoggedIn/i.test(url))) {
    console.log('Retry submit via form.requestSubmit');
    await page.locator('form').first().evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });
    await page.waitForTimeout(1_000);
  }

  console.log('POST_REQUESTS_AFTER_SUBMIT:', postRequests);

  const pageText = await page.locator('body').innerText();
  const requiredHints = pageText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /required|invalid|must|please|error/i.test(line));
  console.log('VALIDATION_HINTS:', requiredHints);

  const fieldValues = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    return inputs.map((input) => ({
      placeholder: input.getAttribute('placeholder'),
      value: (input as HTMLInputElement).value,
      disabled: (input as HTMLInputElement).disabled,
      ariaInvalid: input.getAttribute('aria-invalid'),
      className: input.className,
    }));
  });
  console.log('FIELD_VALUES:', JSON.stringify(fieldValues, null, 2));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const invalidFields = await page.locator('.ng-invalid:not(form)').evaluateAll((elements) =>
    elements
      .map((element) => {
        const input = element as HTMLElement;
        return {
          tag: input.tagName,
          name: input.getAttribute('name'),
          placeholder: input.getAttribute('placeholder'),
          text: input.textContent?.trim().slice(0, 80),
          ariaInvalid: input.getAttribute('aria-invalid'),
        };
      })
      .filter((item) => item.placeholder || item.name || item.text),
  );
  const createDisabled = await page
    .getByRole('button', { name: /^create tenant$/i })
    .last()
    .isDisabled();

  console.log('CREATE_DISABLED:', createDisabled);
  console.log('INVALID_FIELDS:', JSON.stringify(invalidFields, null, 2));

  await page.waitForTimeout(2_000);

  const dialogText = await page.getByRole('alertdialog').allTextContents().catch(() => []);
  const errors = await page
    .locator('.p-error, .p-message-error, .invalid-feedback')
    .allTextContents();
  const toasts = await page
    .locator('.p-toast-message-text, .p-message-text, [role="alert"]')
    .allTextContents();
  const headings = await page.getByRole('heading').allTextContents();

  console.log('HEADINGS:', headings);
  console.log('DIALOG:', dialogText);
  console.log('ERRORS:', errors.filter((text) => text.trim()));
  console.log('TOASTS:', toasts.filter((text) => text.trim()));
  console.log('RESPONSES:\n', responses.join('\n---\n'));

  await page.screenshot({ path: 'test-results/debug-tenant-submit.png', fullPage: true });
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
