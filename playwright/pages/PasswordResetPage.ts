import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { DashboardPage } from './DashboardPage';

export interface PasswordResetData {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export class PasswordResetPage extends BasePage {
  readonly resetHeading: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.resetHeading = page.getByRole('heading', {
      name: /create a new password|reset password|change password|update password|set password/i,
    });
    this.currentPasswordInput = page.getByPlaceholder('Enter current password');
    this.newPasswordInput = page.getByPlaceholder('Enter new password');
    this.confirmPasswordInput = page.getByPlaceholder('Confirm new password');
    this.submitButton = page.getByRole('button', { name: /^change password$/i });
  }

  async expectVisible(): Promise<void> {
    const resetIndicator = this.resetHeading
      .or(this.newPasswordInput)
      .or(this.page.getByText(/create a secure new password|password reset|change your password|mandatory password/i));

    await expect(resetIndicator.first()).toBeVisible({ timeout: 20_000 });
  }

  async isVisible(): Promise<boolean> {
    if (await this.resetHeading.isVisible().catch(() => false)) {
      return true;
    }

    return this.newPasswordInput.isVisible().catch(() => false);
  }

  async fillPasswordResetForm(data: PasswordResetData): Promise<void> {
    await this.currentPasswordInput.fill(data.currentPassword);
    await this.newPasswordInput.fill(data.newPassword);

    const confirmPassword = data.confirmPassword ?? data.newPassword;
    await this.confirmPasswordInput.fill(confirmPassword);

    // Trigger validation so the Change Password button enables.
    await this.confirmPasswordInput.blur();
    await this.page.waitForTimeout(500);
  }

  async resetPassword(data: PasswordResetData): Promise<void> {
    await this.expectVisible();
    await this.fillPasswordResetForm(data);
    await expect(this.submitButton).toBeEnabled({ timeout: 10_000 });
    await this.submitButton.click();
    await this.waitForPageReady();
  }

  async expectPasswordResetComplete(): Promise<void> {
    // App may land on dashboard or bounce back to login after password change.
    const loginHeading = this.page.getByRole('heading', { name: /log in to continue/i });
    const dashboard = new DashboardPage(this.page);

    await expect(
      loginHeading.or(dashboard.sidebarNavigation).or(dashboard.dashboardHeading).first(),
    ).toBeVisible({ timeout: 20_000 });
  }
}
