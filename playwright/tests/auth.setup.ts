import { test as setup } from '../fixtures/persistent.fixture';
import { DashboardPage } from '@pages/DashboardPage';
import { LoginPage } from '@pages/LoginPage';
import { getEnvConfig } from '@utils/env';

setup('bootstrap super admin session', async ({ page }) => {
  setup.setTimeout(300_000);

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

  const env = getEnvConfig();

  await loginPage.open();
  await loginPage.fillCredentials(env.superAdminEmail, env.superAdminPassword);

  setup.info().annotations.push({
    type: 'auth',
    description:
      'Paused: complete captcha and click Log In manually, then Resume in Playwright Inspector',
  });

  await page.pause();

  await loginPage.expectLoggedIn();

  setup.info().annotations.push({
    type: 'auth',
    description: 'Authenticated session saved in persistent Chrome profile',
  });
});
