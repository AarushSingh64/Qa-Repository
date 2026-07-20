import { expect, type Locator, type Page } from '@playwright/test';
import { getOptionalTaxCredentials } from '@utils/env';
import { BasePage } from './BasePage';

export interface TenantData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  brandName: string;
  subDomain: string;
  hasGstin?: boolean;
  gstin?: string;
  panNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  country?: string;
  state?: string;
  city?: string;
}

export class TenantPage extends BasePage {
  readonly createTenantButton: Locator;
  readonly tenantsHeading: Locator;
  readonly saveButton: Locator;
  readonly tenantTable: Locator;

  constructor(page: Page) {
    super(page);
    this.tenantsHeading = page.getByRole('heading', { name: /tenants?|new tenant/i });
    this.createTenantButton = page.getByRole('button', {
      name: /create tenant|add tenant|new tenant/i,
    });
    this.saveButton = page.getByRole('button', { name: /^create tenant$|^save$|^submit$/i });
    this.tenantTable = page.locator('table, .p-datatable');
  }

  async open(): Promise<void> {
    await this.navigateToTenants();
    await expect(
      this.tenantsHeading
        .or(this.createTenantButton)
        .or(this.tenantTable)
        .or(this.page.getByText(/^tenants$/i))
        .first(),
    ).toBeVisible();
  }

  async navigateToTenants(): Promise<void> {
    const sidebar = this.page.locator('nav, aside, .layout-menu, .sidebar, .layout-sidebar');
    const userManagement = sidebar.getByRole('button', { name: /user management/i });

    if (await userManagement.isVisible()) {
      await userManagement.click();
    }

    await sidebar.getByText('Tenants', { exact: true }).click();
    await this.waitForPageReady();
  }

  async startCreateTenant(): Promise<void> {
    await this.createTenantButton.click();
    await this.waitForPageReady();
    await expect(this.page.getByRole('heading', { name: /new tenant/i })).toBeVisible();
  }

  async fillTenantForm(data: TenantData): Promise<void> {
    const taxCredentials = getOptionalTaxCredentials();

    await this.fillByPlaceholder('Enter first name', data.firstName);
    await this.fillByPlaceholder('Enter last name', data.lastName);
    await this.fillByPlaceholder('Enter email address', data.email);
    await this.fillByPlaceholder('Phone Number', data.mobile);

    const useGstin = data.hasGstin ?? false;
    await this.answerGstinQuestion(useGstin);

    if (useGstin) {
      await this.completeGstinFlow(data.gstin ?? taxCredentials.gstin ?? '07CJXPK5497H5Z6');
    } else {
      await this.completePanFlow(data.panNumber ?? taxCredentials.pan ?? 'NHNPS9958A');
    }

    await this.resolveBrandConfiguration(data);

    if (data.addressLine1) {
      await this.fillByPlaceholder('Address Line 1', data.addressLine1);
    }

    if (data.postalCode) {
      await this.fillByPlaceholder('Postal Code', data.postalCode);
    }
  }

  private async answerGstinQuestion(hasGstin: boolean): Promise<void> {
    const gstinSection = this.page
      .locator('div')
      .filter({ has: this.page.getByText(/Do you have a registered GSTIN\?/i) })
      .last();

    await gstinSection
      .getByRole('button', { name: hasGstin ? 'Yes' : 'No', exact: true })
      .click();
    await this.page.waitForTimeout(300);
  }

  private async completePanFlow(panNumber: string): Promise<void> {
    await this.page.getByRole('radio', { name: 'PAN', exact: true }).click();
    await this.fillByPlaceholder('PAN Number', panNumber);

    const verifyButton = this.page
      .getByPlaceholder('PAN Number')
      .locator('xpath=..')
      .getByRole('button')
      .first();
    await expect(verifyButton).toBeEnabled({ timeout: 10_000 });
    await verifyButton.click();
    await this.page.waitForTimeout(2_000);

    const verificationFailed = this.page.getByText(/pan verification failed/i);
    if (await verificationFailed.isVisible().catch(() => false)) {
      throw new Error(
        `PAN verification failed for "${panNumber}". Set a valid TEST_PAN in .env for staging.`,
      );
    }

    await expect(this.page.getByText(/pan verified/i)).toBeVisible({ timeout: 20_000 });
  }

  private async resolveBrandConfiguration(data: TenantData): Promise<void> {
    const brandInput = this.page.getByPlaceholder('Enter brand name');

    if (await brandInput.isEnabled()) {
      await brandInput.fill(data.brandName);
    } else {
      await expect(brandInput).not.toHaveValue('', { timeout: 20_000 });
      const autoBrand = (await brandInput.inputValue()).trim().replace(/\s+/g, ' ');
      if (autoBrand) {
        data.brandName = autoBrand;
      }
    }

    await this.fillByPlaceholder('e.g. mybrand', data.subDomain);
  }

  private async completeGstinFlow(gstin: string): Promise<void> {
    const gstinInput = this.page.getByPlaceholder('GST Number');
    await gstinInput.fill(gstin);

    const verifyButton = gstinInput.locator('xpath=..').getByRole('button').first();
    await expect(verifyButton).toBeEnabled({ timeout: 10_000 });
    await verifyButton.click();
    await this.page.waitForTimeout(2_000);

    const verificationFailed = this.page.getByText(/gstin verification failed|gst verification failed/i);
    if (await verificationFailed.isVisible().catch(() => false)) {
      throw new Error(
        `GSTIN verification failed for "${gstin}". Set a valid TEST_GSTIN in .env for staging.`,
      );
    }

    await expect(this.page.getByText(/gst verified|gstin verified/i)).toBeVisible({
      timeout: 20_000,
    });
  }

  async createTenant(data: TenantData): Promise<void> {
    await this.open();
    await this.startCreateTenant();
    await this.fillTenantForm(data);
    await this.submitTenantForm();
    await this.expectTenantCreated(data.brandName);
  }

  async createTenantOrReuse(data: TenantData, brandHint?: string): Promise<void> {
    await this.open();

    try {
      await this.startCreateTenant();
      await this.fillTenantForm(data);
      await this.submitTenantForm();
      await this.expectTenantCreated(data.brandName);
    } catch (error) {
      const hint = brandHint ?? data.brandName;
      const message = error instanceof Error ? error.message : String(error);
      const isDuplicate =
        /already exists|duplicate|already registered|failed to create tenant/i.test(message);

      await this.open();
      const existingRow = this.tenantTable.getByRole('row', { name: new RegExp(hint, 'i') });
      if (isDuplicate && (await existingRow.first().isVisible().catch(() => false))) {
        await this.reuseExistingTenantRow(data, existingRow.first(), hint);
        return;
      }

      throw error;
    }
  }

  private async reuseExistingTenantRow(
    data: TenantData,
    row: Locator,
    brandHint: string,
  ): Promise<void> {
    const rowText = await row.innerText();
    data.brandName = brandHint;
    const emailMatch = rowText.match(/[\w.-]+@[\w.-]+\.\w+/i);
    if (emailMatch) {
      data.email = emailMatch[0];
    }

    await this.expectTenantVisible(brandHint);
  }

  async submitTenantForm(): Promise<void> {
    await this.dismissBlockingOverlays();

    const createButton = this.page.getByRole('button', { name: /^create tenant$/i }).last();
    await createButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);

    const successToast = this.page
      .locator('.p-toast-message-text, .p-message-text, [role="alert"]')
      .filter({ hasText: /created|success|saved/i });
    const errorToast = this.page
      .locator('.p-toast-message-text, .p-message-text, [role="alert"]')
      .filter({
        hasText:
          /validation error|must not|required|invalid|already|duplicate|failed to create|error/i,
      });
    const tenantsHeading = this.page.getByRole('heading', { name: /^tenants$/i });

    try {
      await createButton.click({ timeout: 5_000 });
    } catch {
      await this.dismissBlockingOverlays();
      await createButton.click({ force: true });
    }

    // GST verification toasts can leave an invisible overlay; force-click if still blocked.
    await this.page.waitForTimeout(500);
    if (await this.page.getByRole('heading', { name: /new tenant/i }).isVisible().catch(() => false)) {
      const stillOnForm = !(await successToast
        .or(errorToast)
        .or(tenantsHeading)
        .first()
        .isVisible()
        .catch(() => false));
      if (stillOnForm) {
        await this.dismissBlockingOverlays();
        await createButton.click({ force: true });
      }
    }

    await expect(successToast.or(errorToast).or(tenantsHeading).first()).toBeVisible({
      timeout: 20_000,
    });

    if (await errorToast.first().isVisible().catch(() => false)) {
      const message = (await errorToast.first().textContent())?.trim() ?? 'Unknown validation error';
      throw new Error(`Tenant form validation failed: ${message}`);
    }

    await this.waitForPageReady();
  }

  private async dismissBlockingOverlays(): Promise<void> {
    const closeButtons = this.page.locator(
      '.p-toast-icon-close, .p-dialog-header-close, button[aria-label="Close"]',
    );
    const count = await closeButtons.count();
    for (let index = 0; index < count; index += 1) {
      const button = closeButtons.nth(index);
      if (await button.isVisible().catch(() => false)) {
        await button.click({ force: true }).catch(() => undefined);
      }
    }

    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(200);
  }

  async expectTenantCreated(brandName: string): Promise<void> {
    const successMessage = this.page
      .locator('.p-toast-message-text, .p-message-text, .Toastify__toast-body')
      .filter({ hasText: /created|success|saved/i });
    const tenantsList = this.page.getByRole('heading', { name: /^tenants$/i });

    await expect(successMessage.or(tenantsList).first()).toBeVisible({ timeout: 20_000 });

    if (await this.tenantTable.isVisible().catch(() => false)) {
      await this.expectTenantVisible(brandName);
    }
  }

  async expectTenantVisible(brandName: string): Promise<void> {
    const pattern = new RegExp(brandName.trim().replace(/\s+/g, '\\s+'), 'i');
    const row = this.tenantTable.getByRole('row', { name: pattern });
    await expect(row.first()).toBeVisible();
  }
}
