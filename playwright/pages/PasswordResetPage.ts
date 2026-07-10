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
      name: /reset password|change password|update password|set password/i,
    });
    this.currentPasswordInput = page
      .getByPlaceholder(/current password|old password|temporary password/i)
      .or(page.getByLabel(/current password|old password|temporary password/i));
    this.newPasswordInput = page
      .getByPlaceholder(/new password/i)
      .or(page.getByLabel(/new password/i));
    this.confirmPasswordInput = page
      .getByPlaceholder(/confirm password|re-enter password|repeat password/i)
      .or(page.getByLabel(/confirm password|re-enter password|repeat password/i));
    this.submitButton = page.getByRole('button', {
      name: /reset|change|update|submit|continue|save/i,
    });
  }

  async expectVisible(): Promise<void> {
    const resetIndicator = this.resetHeading
      .or(this.newPasswordInput)
      .or(this.page.getByText(/password reset|change your password|mandatory password/i));

    await expect(resetIndicator.first()).toBeVisible({ timeout: 20_000 });
  }

  async isVisible(): Promise<boolean> {
    if (await this.resetHeading.isVisible().catch(() => false)) {
      return true;
    }

    return (await this.newPasswordInput.count()) > 0;
  }

  async fillPasswordResetForm(data: PasswordResetData): Promise<void> {
    if (await this.currentPasswordInput.count()) {
      await this.currentPasswordInput.first().fill(data.currentPassword);
    }

    await this.newPasswordInput.first().fill(data.newPassword);

    const confirmPassword = data.confirmPassword ?? data.newPassword;
    if (await this.confirmPasswordInput.count()) {
      await this.confirmPasswordInput.first().fill(confirmPassword);
    }
  }

  async resetPassword(data: PasswordResetData): Promise<void> {
    await this.expectVisible();
    await this.fillPasswordResetForm(data);
    await this.submitButton.first().click();
    await this.waitForPageReady();
  }

  async expectPasswordResetComplete(): Promise<void> {
    await expect(this.page).not.toHaveURL(/reset|change-password|password-reset/i, {
      timeout: 20_000,
    });

    const dashboard = new DashboardPage(this.page);
    await dashboard.expectVisible();
  }
}
