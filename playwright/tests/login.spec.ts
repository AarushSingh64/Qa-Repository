import { expect, test } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { getEnvConfig } from '@utils/env';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.open();
  });

  test('LOGIN-001 Valid Super Admin Login', async () => {
    await loginPage.loginAsSuperAdmin({ requireCaptchaSolution: false });
    await loginPage.expectLoggedIn();
  });

  test('LOGIN-002 Invalid Password', async ({ page }) => {
    const env = getEnvConfig();

    await loginPage.login(env.superAdminEmail, 'InvalidPassword@123', {
      requireCaptchaSolution: false,
    });

    await expect(page).toHaveURL(/\/account\/login\/?$/);
    await expect(loginPage.loginHeading).toBeVisible();
    await loginPage.expectLoginError(/invalid|incorrect|wrong|credentials|captcha/i);
  });

  test('LOGIN-003 Empty Username', async ({ page }) => {
    await loginPage.passwordInput.fill('Password@123');
    await loginPage.submitLogin();

    await expect(page).toHaveURL(/\/account\/login\/?$/);
    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.identifierInput).toBeEmpty();
  });

  test('LOGIN-004 Empty Password', async ({ page }) => {
    const env = getEnvConfig();

    await loginPage.identifierInput.fill(env.superAdminEmail);
    await loginPage.submitLogin();

    await expect(page).toHaveURL(/\/account\/login\/?$/);
    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.passwordInput).toBeEmpty();
  });

  test('LOGIN-005 Logout', async () => {
    await loginPage.loginAsSuperAdmin({ requireCaptchaSolution: false });
    await loginPage.expectLoggedIn();
    await loginPage.logout();
    await loginPage.expectLoggedOut();
  });
});
