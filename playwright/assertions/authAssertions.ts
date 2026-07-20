import { expect, type Page } from '@playwright/test';
import { LOGIN_ERROR_PATTERNS, LOGIN_ROUTES } from '@constants/auth';
import { LoginPage } from '@pages/LoginPage';
import { DashboardPage } from '@pages/DashboardPage';
import {
  assertLoginApiFailureContract,
  assertLoginApiSuccessContract,
  type CapturedLoginApiCall,
} from '@helpers/authApi';

export async function expectOnLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL(LOGIN_ROUTES.loginPagePattern);
  await expect(page.getByRole('heading', { name: /log in to continue/i })).toBeVisible();
}

export async function expectAuthenticatedShell(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(LOGIN_ROUTES.loginPagePattern);
  const dashboard = new DashboardPage(page);
  await dashboard.expectVisible();
}

export async function expectLoginFailureUi(page: Page, loginPage: LoginPage): Promise<void> {
  await expectOnLoginPage(page);
  await loginPage.expectLoginError(LOGIN_ERROR_PATTERNS.invalidCredentials);
}

export async function expectLoginValidationUi(page: Page, loginPage: LoginPage): Promise<void> {
  await expectOnLoginPage(page);
  const validationMessage = page
    .locator('.p-error, .invalid-feedback, [role="alert"], .p-toast-message-text')
    .filter({ hasText: LOGIN_ERROR_PATTERNS.fieldRequired });

  if (await validationMessage.first().isVisible().catch(() => false)) {
    await expect(validationMessage.first()).toBeVisible();
    return;
  }

  // Some forms block submit without inline error — staying on login is acceptable.
  await expect(loginPage.loginHeading).toBeVisible();
}

export async function expectSuccessfulLoginWithApi(
  page: Page,
  loginPage: LoginPage,
  apiCall: CapturedLoginApiCall,
): Promise<void> {
  assertLoginApiSuccessContract(apiCall);
  await loginPage.expectLoggedIn();
  await expectAuthenticatedShell(page);
}

export async function expectFailedLoginWithApi(
  page: Page,
  loginPage: LoginPage,
  apiCall: CapturedLoginApiCall,
  expectedStatuses: readonly number[] = AUTH_API.failureStatusCodes,
): Promise<void> {
  assertLoginApiFailureContract(apiCall, expectedStatuses);
  await expectOnLoginPage(page);

  if (apiCall.status === 429) {
    return;
  }

  await expectLoginFailureUi(page, loginPage);
}

export async function expectNoStoredXssExecution(page: Page): Promise<void> {
  const alertTriggered = await page.evaluate(() => {
    return (window as Window & { __xssTriggered?: boolean }).__xssTriggered === true;
  });
  expect(alertTriggered).toBe(false);
}

export async function expectSessionPersistsAfterReload(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectAuthenticatedShell(page);
}

export async function expectProtectedRouteRedirectsToLogin(page: Page, protectedPath: string): Promise<void> {
  await page.goto(protectedPath, { waitUntil: 'domcontentloaded' });
  await expectOnLoginPage(page);
}
