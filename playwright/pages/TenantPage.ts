import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface TenantData {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export class TenantPage extends BasePage {
  readonly createTenantButton: Locator;
  readonly tenantsHeading: Locator;
  readonly saveButton: Locator;
  readonly tenantTable: Locator;

  constructor(page: Page) {
    super(page);
    this.tenantsHeading = page.getByRole('heading', { name: /tenants?/i });
    this.createTenantButton = page.getByRole('button', { name: /create tenant|add tenant|new tenant/i });
    this.saveButton = page.getByRole('button', { name: /save|submit|create/i });
    this.tenantTable = page.locator('table, .p-datatable');
  }

  async open(): Promise<void> {
    await this.navigateToTenants();
    await expect(this.tenantsHeading).toBeVisible();
  }

  async navigateToTenants(): Promise<void> {
    await this.openMenuItem(/tenants?/i);
    await this.waitForPageReady();
  }

  async startCreateTenant(): Promise<void> {
    await this.createTenantButton.click();
    await this.waitForPageReady();
  }

  async fillTenantForm(data: TenantData): Promise<void> {
    await this.fillField(/business name|company name|tenant name/i, data.businessName);
    await this.fillField(/owner name|contact name/i, data.ownerName);
    await this.fillField(/owner email|email/i, data.ownerEmail);

    if (data.ownerMobile) {
      await this.fillField(/mobile|phone/i, data.ownerMobile);
    }

    if (data.addressLine1) {
      await this.fillField(/address/i, data.addressLine1);
    }

    if (data.city) {
      await this.fillField(/city/i, data.city);
    }

    if (data.state) {
      await this.fillField(/state/i, data.state);
    }

    if (data.pincode) {
      await this.fillField(/pin\s*code|zip|postal/i, data.pincode);
    }

    if (data.country) {
      await this.selectOptionFromCombobox(/country/i, data.country);
    }
  }

  async createTenant(data: TenantData): Promise<void> {
    await this.open();
    await this.startCreateTenant();
    await this.fillTenantForm(data);
    await this.saveButton.click();
    await this.waitForPageReady();
  }

  async expectTenantCreated(businessName: string): Promise<void> {
    await this.expectToast(/created|success/i);
    await this.expectTenantVisible(businessName);
  }

  async expectTenantVisible(businessName: string): Promise<void> {
    const row = this.tenantTable.getByRole('row', { name: new RegExp(businessName, 'i') });
    await expect(row.first()).toBeVisible();
  }

}
