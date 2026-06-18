import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface RoleData {
  name: string;
  description?: string;
  permissions?: string[];
}

export class RolePage extends BasePage {
  readonly rolesHeading: Locator;
  readonly createRoleButton: Locator;
  readonly saveButton: Locator;
  readonly roleTable: Locator;

  constructor(page: Page) {
    super(page);
    this.rolesHeading = page.getByRole('heading', { name: /roles?/i });
    this.createRoleButton = page.getByRole('button', { name: /create role|add role|new role/i });
    this.saveButton = page.getByRole('button', { name: /save|submit|create/i });
    this.roleTable = page.locator('table, .p-datatable');
  }

  async open(): Promise<void> {
    await this.navigateToRoles();
    await expect(this.rolesHeading).toBeVisible();
  }

  async navigateToRoles(): Promise<void> {
    await this.openMenuItem(/roles?/i);
    await this.waitForPageReady();
  }

  async startCreateRole(): Promise<void> {
    await this.createRoleButton.click();
    await this.waitForPageReady();
  }

  async fillRoleForm(data: RoleData): Promise<void> {
    await this.fillField(/role name|name/i, data.name);

    if (data.description) {
      await this.fillField(/description/i, data.description);
    }

    if (data.permissions?.length) {
      await this.selectPermissions(data.permissions);
    }
  }

  async createRole(data: RoleData): Promise<void> {
    await this.open();
    await this.startCreateRole();
    await this.fillRoleForm(data);
    await this.saveButton.click();
    await this.waitForPageReady();
  }

  async selectPermissions(permissions: string[]): Promise<void> {
    for (const permission of permissions) {
      const permissionCheckbox = this.page.getByRole('checkbox', {
        name: new RegExp(permission, 'i'),
      });

      if (await permissionCheckbox.count()) {
        await permissionCheckbox.first().check();
        continue;
      }

      const permissionRow = this.page
        .locator('tr, .permission-item, .p-checkbox')
        .filter({ hasText: new RegExp(permission, 'i') })
        .first();

      await permissionRow.click();
    }
  }

  async expectRoleCreated(roleName: string): Promise<void> {
    await this.expectToast(/created|success/i);
    await this.expectRoleVisible(roleName);
  }

  async expectRoleVisible(roleName: string): Promise<void> {
    const row = this.roleTable.getByRole('row', { name: new RegExp(roleName, 'i') });
    await expect(row.first()).toBeVisible();
  }

}
