import type { Page } from '@playwright/test';
import { DashboardPage } from '@pages/DashboardPage';
import { LoginPage } from '@pages/LoginPage';

export async function ensureSuperAdminSession(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await page.goto('/account/login', { waitUntil: 'domcontentloaded' });

  if (await dashboardPage.isVisible()) {
    return;
  }

  await loginPage.open();
  await loginPage.loginAsSuperAdmin({
    requireCaptchaSolution: false,
    verifySuccess: true,
  });
}
