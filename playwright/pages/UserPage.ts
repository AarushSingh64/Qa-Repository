import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface UserData {
  name: string;
  email: string;
  mobile?: string;
  password?: string;
}

export interface UserAssignmentData {
  roleName: string;
  locationNames: string[];
}

export class UserPage extends BasePage {
  readonly usersHeading: Locator;
  readonly createUserButton: Locator;
  readonly saveButton: Locator;
  readonly assignButton: Locator;
  readonly userTable: Locator;

  constructor(page: Page) {
    super(page);
    this.usersHeading = page.getByRole('heading', { name: /users?/i });
    this.createUserButton = page.getByRole('button', { name: /create user|add user|new user/i });
    this.saveButton = page.getByRole('button', { name: /save|submit|create/i });
    this.assignButton = page.getByRole('button', { name: /assign|save assignment|update/i });
    this.userTable = page.locator('table, .p-datatable');
  }

  async open(): Promise<void> {
    await this.navigateToUsers();
    await expect(this.usersHeading).toBeVisible();
  }

  async navigateToUsers(): Promise<void> {
    await this.openMenuItem(/users?/i);
    await this.waitForPageReady();
  }

  async startCreateUser(): Promise<void> {
    await this.createUserButton.click();
    await this.waitForPageReady();
  }

  async fillUserForm(data: UserData): Promise<void> {
    await this.fillField(/user name|full name|name/i, data.name);
    await this.fillField(/email/i, data.email);

    if (data.mobile) {
      await this.fillField(/mobile|phone/i, data.mobile);
    }

    if (data.password) {
      await this.fillField(/password/i, data.password);
    }
  }

  async createUser(data: UserData): Promise<void> {
    await this.open();
    await this.startCreateUser();
    await this.fillUserForm(data);
    await this.saveButton.click();
    await this.waitForPageReady();
  }

  async openUserDetails(userName: string): Promise<void> {
    const row = this.userTable.getByRole('row', { name: new RegExp(userName, 'i') });
    await row.first().click();
    await this.waitForPageReady();
  }

  async assignRole(roleName: string): Promise<void> {
    await this.selectOptionFromCombobox(/role/i, new RegExp(roleName, 'i'));
  }

  async assignLocations(locationNames: string[]): Promise<void> {
    for (const locationName of locationNames) {
      const locationOption = this.page
        .getByRole('checkbox', { name: new RegExp(locationName, 'i') })
        .or(this.page.getByRole('option', { name: new RegExp(locationName, 'i') }));

      if (await locationOption.count()) {
        await locationOption.first().click();
        continue;
      }

      await this.selectOptionFromCombobox(/location/i, new RegExp(locationName, 'i'));
    }
  }

  async assignRoleAndLocations(userName: string, assignment: UserAssignmentData): Promise<void> {
    await this.openUserDetails(userName);
    await this.assignRole(assignment.roleName);
    await this.assignLocations(assignment.locationNames);
    await this.assignButton.click();
    await this.waitForPageReady();
  }

  async createUserWithAssignment(data: UserData, assignment: UserAssignmentData): Promise<void> {
    await this.createUser(data);
    await this.assignRoleAndLocations(data.name, assignment);
  }

  async expectUserCreated(userName: string): Promise<void> {
    await this.expectToast(/created|success/i);
    await this.expectUserVisible(userName);
  }

  async expectUserVisible(userName: string): Promise<void> {
    const row = this.userTable.getByRole('row', { name: new RegExp(userName, 'i') });
    await expect(row.first()).toBeVisible();
  }

  async expectUserAssignment(userName: string, assignment: UserAssignmentData): Promise<void> {
    await this.openUserDetails(userName);

    await expect(this.page.getByText(new RegExp(assignment.roleName, 'i'))).toBeVisible();

    for (const locationName of assignment.locationNames) {
      await expect(this.page.getByText(new RegExp(locationName, 'i'))).toBeVisible();
    }
  }

}
