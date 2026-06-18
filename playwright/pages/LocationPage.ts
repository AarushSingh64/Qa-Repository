import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type LocationType = 'Distribution Center' | 'Store';

export interface LocationData {
  name: string;
  code?: string;
  type: LocationType;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactPerson?: string;
  contactNumber?: string;
}

export class LocationPage extends BasePage {
  readonly locationsHeading: Locator;
  readonly createLocationButton: Locator;
  readonly saveButton: Locator;
  readonly locationTable: Locator;

  constructor(page: Page) {
    super(page);
    this.locationsHeading = page.getByRole('heading', { name: /locations?/i });
    this.createLocationButton = page.getByRole('button', {
      name: /create location|add location|new location/i,
    });
    this.saveButton = page.getByRole('button', { name: /save|submit|create/i });
    this.locationTable = page.locator('table, .p-datatable');
  }

  async open(): Promise<void> {
    await this.navigateToLocations();
    await expect(this.locationsHeading).toBeVisible();
  }

  async navigateToLocations(): Promise<void> {
    await this.openMenuItem(/locations?/i);
    await this.waitForPageReady();
  }

  async startCreateLocation(): Promise<void> {
    await this.createLocationButton.click();
    await this.waitForPageReady();
  }

  async fillLocationForm(data: LocationData): Promise<void> {
    await this.selectLocationType(data.type);
    await this.fillField(/location name|name/i, data.name);

    if (data.code) {
      await this.fillField(/location code|code/i, data.code);
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

    if (data.contactPerson) {
      await this.fillField(/contact person|contact name/i, data.contactPerson);
    }

    if (data.contactNumber) {
      await this.fillField(/contact number|mobile|phone/i, data.contactNumber);
    }
  }

  async createDistributionCenter(data: Omit<LocationData, 'type'>): Promise<void> {
    await this.createLocation({ ...data, type: 'Distribution Center' });
  }

  async createStore(data: Omit<LocationData, 'type'>): Promise<void> {
    await this.createLocation({ ...data, type: 'Store' });
  }

  async createLocation(data: LocationData): Promise<void> {
    await this.open();
    await this.startCreateLocation();
    await this.fillLocationForm(data);
    await this.saveButton.click();
    await this.waitForPageReady();
  }

  async expectLocationCreated(name: string, type?: LocationType): Promise<void> {
    await this.expectToast(/created|success/i);
    await this.expectLocationVisible(name, type);
  }

  async expectLocationVisible(name: string, type?: LocationType): Promise<void> {
    const row = this.locationTable.getByRole('row', { name: new RegExp(name, 'i') });
    await expect(row.first()).toBeVisible();

    if (type) {
      await expect(row.first()).toContainText(new RegExp(type, 'i'));
    }
  }

  private async selectLocationType(type: LocationType): Promise<void> {
    const typeLabel = type === 'Distribution Center' ? /distribution center|dc/i : /store/i;
    await this.selectOptionFromCombobox(/location type|type/i, typeLabel);
  }

}
