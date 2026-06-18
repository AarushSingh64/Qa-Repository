import { expect, test } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { LoginBlockedByCaptchaError } from '@utils/errors';
import { getEnvConfig } from '@utils/env';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.open();
  });

  test('LOGIN-001 Valid Super Admin Login', async () => {
    const captchaStatus = await loginPage.getCaptchaStatus();
    if (captchaStatus.present) {
      await expect(loginPage.captcha.captchaTokenInput.first()).toBeAttached();
    }

    try {
      await loginPage.loginAsSuperAdmin();
      await loginPage.expectLoggedIn();
    } catch (error) {
      if (error instanceof LoginBlockedByCaptchaError) {
        expect(error.message).toBe('Login blocked by captcha.');
        expect(error.captchaStatus.present).toBe(true);
        throw error;
      }
      throw error;
    }
  });

  test('LOGIN-002 Invalid Password', async ({ page }) => {
    const env = getEnvConfig();

    await loginPage.login(env.superAdminEmail, 'InvalidPassword@123', {
      requireCaptchaSolution: false,
    });

    await expect(page).toHaveURL(/\/account\/login\/?$/);
    await expect(loginPage.loginHeading).toBeVisible();

    const captchaStatus = await loginPage.getCaptchaStatus();
    if (captchaStatus.errorVisible) {
      await loginPage.expectCaptchaRequired();
      return;
    }

    await loginPage.expectLoginError(/invalid|incorrect|wrong|credentials/i);
  });

  test('LOGIN-003 Empty Username', async ({ page }) => {
    await loginPage.passwordInput.fill('Password@123');
    await loginPage.submitLogin();

    await expect(page).toHaveURL(/\/account\/login\/?$/);
    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.identifierInput).toBeEmpty();

    const captchaStatus = await loginPage.getCaptchaStatus();
    if (captchaStatus.errorVisible) {
      await loginPage.expectCaptchaRequired();
    }
  });

  test('LOGIN-004 Empty Password', async ({ page }) => {
    const env = getEnvConfig();

    await loginPage.identifierInput.fill(env.superAdminEmail);
    await loginPage.submitLogin();

    await expect(page).toHaveURL(/\/account\/login\/?$/);
    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.passwordInput).toBeEmpty();

    const captchaStatus = await loginPage.getCaptchaStatus();
    if (captchaStatus.errorVisible) {
      await loginPage.expectCaptchaRequired();
    }
  });

  test('LOGIN-005 Logout', async () => {
    try {
      await loginPage.loginAsSuperAdmin();
      await loginPage.expectLoggedIn();
      await loginPage.logout();
      await loginPage.expectLoggedOut();
    } catch (error) {
      if (error instanceof LoginBlockedByCaptchaError) {
        expect(error.message).toBe('Login blocked by captcha.');
        throw error;
      }
      throw error;
    }
  });
});
