import { test as setup } from '../fixtures/persistent.fixture';
import { DashboardPage } from '@pages/DashboardPage';
import { LoginPage } from '@pages/LoginPage';

setup('bootstrap super admin session', async ({ page }) => {
  setup.setTimeout(120_000);

  const dashboardPage = new DashboardPage(page);
  const loginPage = new LoginPage(page);
  const forceReauth = process.env.AUTH_FORCE?.trim().toLowerCase() === 'true';

  await page.goto('/');

  if (!forceReauth && (await dashboardPage.isVisible())) {
    setup.info().annotations.push({
      type: 'auth',
      description: 'Persistent Chrome profile already authenticated — skipping login',
    });
    return;
  }

  await loginPage.open();
  await loginPage.loginAsSuperAdmin({ requireCaptchaSolution: false });
  await loginPage.expectLoggedIn();

  setup.info().annotations.push({
    type: 'auth',
    description: 'Super admin session saved in persistent Chrome profile',
  });
});
