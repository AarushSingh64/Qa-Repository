import { expect, type Locator, type Page } from '@playwright/test';
import { TurnstileCaptchaHelper, type CaptchaStatus } from '@utils/captcha';
import { getEnvConfig } from '@utils/env';
import { LoginBlockedByCaptchaError } from '@utils/errors';
import { BasePage } from './BasePage';
import { DashboardPage } from './DashboardPage';

export interface LoginOptions {
  /** When true, throws LoginBlockedByCaptchaError if captcha prevents authentication. Default: true */
  requireCaptchaSolution?: boolean;
  /** When true, verifies dashboard is shown after submit. Default: false */
  verifySuccess?: boolean;
}

export class LoginPage extends BasePage {
  readonly loginHeading: Locator;
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly captcha: TurnstileCaptchaHelper;

  constructor(page: Page) {
    super(page);
    this.loginHeading = page.getByRole('heading', { name: 'Login To Continue' });
    this.identifierInput = page.getByPlaceholder('Mobile Number or Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Log In' });
    this.forgotPasswordLink = page.getByText('Forgot Password?');
    this.captcha = new TurnstileCaptchaHelper(page);
  }

  async open(): Promise<void> {
    await this.goto('/account/login');
    await expect(this.loginHeading).toBeVisible();
    await this.expectCaptchaDetectedIfPresent();
  }

  async getCaptchaStatus(): Promise<CaptchaStatus> {
    return this.captcha.getStatus();
  }

  async expectCaptchaDetectedIfPresent(): Promise<void> {
    const status = await this.captcha.getStatus();
    if (status.present) {
      await expect(this.captcha.captchaTokenInput.first()).toBeAttached();
    }
  }

  async fillCredentials(identifier: string, password: string): Promise<void> {
    await this.identifierInput.fill(identifier.trim());
    await this.passwordInput.fill(password.trim());
  }

  async submitLogin(): Promise<void> {
    await this.loginButton.click();
    await this.waitForPageReady();
  }

  async login(identifier: string, password: string, options: LoginOptions = {}): Promise<void> {
    const { requireCaptchaSolution = true, verifySuccess = false } = options;

    await this.fillCredentials(identifier, password);

    const preSubmitStatus = await this.captcha.getStatus();
    if (preSubmitStatus.present && requireCaptchaSolution) {
      const tokenObtained = await this.captcha.solveCaptcha();
      if (!tokenObtained) {
        await this.submitLogin();
        await this.assertCaptchaNotBlockingLogin();
        return;
      }
    }

    await this.submitLogin();

    if (requireCaptchaSolution) {
      await this.assertCaptchaNotBlockingLogin();
    }

    if (verifySuccess) {
      await this.expectLoggedIn();
    }
  }

  async loginAsSuperAdmin(options: LoginOptions = {}): Promise<void> {
    const env = getEnvConfig();
    await this.login(env.superAdminEmail, env.superAdminPassword, {
      requireCaptchaSolution: true,
      verifySuccess: false,
      ...options,
    });
  }

  async loginAsTenant(email: string, password: string, options: LoginOptions = {}): Promise<void> {
    await this.login(email, password, {
      requireCaptchaSolution: true,
      verifySuccess: false,
      ...options,
    });
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async expectLoginError(message: string | RegExp): Promise<void> {
    const errorMessage = this.page
      .locator('.p-error, .invalid-feedback, [role="alert"], .p-toast-message-text')
      .filter({ hasText: message });
    await expect(errorMessage.first()).toBeVisible();
  }

  async expectCaptchaRequired(): Promise<void> {
    await expect(this.captcha.captchaErrorAlert.first()).toBeVisible();
    await expect(this.captcha.captchaErrorAlert.first()).toHaveText(/captcha is required/i);

    const status = await this.captcha.getStatus();
    expect(status.present).toBe(true);
    expect(status.tokenPresent).toBe(false);
  }

  async assertCaptchaNotBlockingLogin(): Promise<void> {
    if (await this.isOnLoginPage()) {
      await this.assertAuthenticationSucceeded();
    }
  }

  /**
   * Validates login succeeded before any dashboard assertion.
   * Checks login URL, Turnstile token, and captcha errors — does not touch dashboard locators.
   */
  async assertAuthenticationSucceeded(): Promise<void> {
    const status = await this.captcha.getStatus();
    const onLoginPage = await this.isOnLoginPage();

    if (onLoginPage) {
      if (status.errorVisible) {
        throw new LoginBlockedByCaptchaError(status);
      }

      if (status.present && !status.tokenPresent) {
        throw new LoginBlockedByCaptchaError(status);
      }

      throw new LoginBlockedByCaptchaError({
        ...status,
        errorVisible: true,
        errorMessage: status.errorMessage ?? 'Authentication failed: still on login page',
      });
    }

    if (status.errorVisible) {
      throw new LoginBlockedByCaptchaError(status);
    }

    if (status.present && !status.tokenPresent) {
      throw new LoginBlockedByCaptchaError(status);
    }
  }

  async isOnLoginPage(): Promise<boolean> {
    return /\/account\/login\/?$/.test(this.page.url());
  }

  async expectLoggedIn(): Promise<void> {
    await this.assertAuthenticationSucceeded();

    const dashboard = new DashboardPage(this.page);
    await dashboard.expectVisible();
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.page).toHaveURL(/\/account\/login\/?$/);
    await expect(this.loginHeading).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.assertAuthenticationSucceeded();

    const dashboard = new DashboardPage(this.page);
    await dashboard.expectVisible();

    if (await dashboard.userMenu.count()) {
      await dashboard.userMenu.first().click();
    }

    const logoutAction = this.page
      .getByRole('button', { name: /log out|logout|sign out/i })
      .or(this.page.getByRole('menuitem', { name: /log out|logout|sign out/i }))
      .or(this.page.getByRole('link', { name: /log out|logout|sign out/i }));

    await logoutAction.first().click();
    await this.expectLoggedOut();
  }
}
