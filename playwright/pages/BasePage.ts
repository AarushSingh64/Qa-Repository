import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    const busyOverlay = this.page.locator('.p-component-overlay, .p-progress-spinner');
    await busyOverlay.first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  }

  async fillByPlaceholder(placeholder: string, value: string): Promise<void> {
    await this.page.getByPlaceholder(placeholder).fill(value);
  }

  async clickButton(name: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name }).click();
  }

  async clickLink(name: string | RegExp): Promise<void> {
    await this.page.getByRole('link', { name }).click();
  }

  async expectHeading(text: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  async expectToast(text: string | RegExp): Promise<void> {
    const toast = this.page
      .locator('.p-toast-message-text, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: text });
    await expect(toast.first()).toBeVisible();
  }

  async selectOptionFromCombobox(label: string | RegExp, option: string | RegExp): Promise<void> {
    const container = this.page.locator('label', { hasText: label }).first();
    await expect(container).toBeVisible();
    const fieldContainer = container.locator('xpath=..');
    const combobox = fieldContainer.locator('[role="combobox"], .p-dropdown, .p-select').first();
    await combobox.click();
    await this.page.getByRole('option', { name: option }).click();
  }

  async takeDebugScreenshot(name: string): Promise<void> {
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
    await this.page.screenshot({
      path: `test-results/debug-${safeName}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  protected locatorByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected async openMenuItem(name: string | RegExp): Promise<void> {
    const menuLink = this.page
      .locator('nav, aside, .layout-menu, .sidebar')
      .getByRole('link', { name })
      .or(this.page.getByRole('link', { name }));

    await menuLink.first().click();
  }

  protected async fillField(label: string | RegExp, value: string): Promise<void> {
    const labelledInput = this.page.getByLabel(label);
    if (await labelledInput.count()) {
      await labelledInput.first().fill(value);
      return;
    }

    const placeholderInput = this.page.getByPlaceholder(label);
    if (await placeholderInput.count()) {
      await placeholderInput.first().fill(value);
      return;
    }

    const labelElement = this.page.locator('label', { hasText: label }).first();
    await expect(labelElement).toBeVisible();
    await labelElement.locator('xpath=..').locator('input, textarea').first().fill(value);
  }
}
