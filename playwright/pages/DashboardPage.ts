import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly sidebarNavigation: Locator;
  readonly dashboardHeading: Locator;
  readonly mainLayout: Locator;
  readonly userMenu: Locator;
  readonly profileMenuButton: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebarNavigation = page.locator('nav, aside, .layout-sidebar, .layout-menu, .sidebar');
    this.dashboardHeading = page.getByRole('heading', { name: /dashboard|coming soon/i });
    this.mainLayout = page.locator('.layout-main, .layout-wrapper, main');
    this.profileMenuButton = page
      .getByLabel('Profile menu')
      .getByRole('button')
      .or(page.locator('[aria-label="Profile menu"] button'));
    this.userMenu = this.profileMenuButton.or(
      page.getByRole('button', { name: /profile|account|user|menu/i }),
    );
  }

  async openProfileMenu(): Promise<void> {
    await this.profileMenuButton.first().click();
  }

  async expectVisible(): Promise<void> {
    const dashboardIndicator = this.sidebarNavigation
      .or(this.dashboardHeading)
      .or(this.mainLayout)
      .or(this.userMenu);

    await expect(dashboardIndicator.first()).toBeVisible({ timeout: 20_000 });
  }

  async isVisible(): Promise<boolean> {
    if (await this.loginPageOnScreen()) {
      return false;
    }

    const dashboardIndicator = this.sidebarNavigation
      .or(this.dashboardHeading)
      .or(this.mainLayout)
      .or(this.userMenu);

    return dashboardIndicator.first().isVisible();
  }

  private async loginPageOnScreen(): Promise<boolean> {
    return this.page
      .getByRole('heading', { name: /log in to continue/i })
      .isVisible()
      .catch(() => false);
  }
}
