import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly sidebarNavigation: Locator;
  readonly dashboardHeading: Locator;
  readonly mainLayout: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.sidebarNavigation = page.locator('nav, aside, .layout-sidebar, .layout-menu, .sidebar');
    this.dashboardHeading = page.getByRole('heading', { name: /dashboard/i });
    this.mainLayout = page.locator('.layout-main, .layout-wrapper, main');
    this.userMenu = page.getByRole('button', { name: /profile|account|user|menu/i });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/account\/login\/?$/);

    const dashboardIndicator = this.sidebarNavigation
      .or(this.dashboardHeading)
      .or(this.mainLayout)
      .or(this.userMenu);

    await expect(dashboardIndicator.first()).toBeVisible({ timeout: 20_000 });
  }

  async isVisible(): Promise<boolean> {
    if (/\/account\/login\/?$/.test(this.page.url())) {
      return false;
    }

    const dashboardIndicator = this.sidebarNavigation
      .or(this.dashboardHeading)
      .or(this.mainLayout)
      .or(this.userMenu);

    return dashboardIndicator.first().isVisible();
  }
}
