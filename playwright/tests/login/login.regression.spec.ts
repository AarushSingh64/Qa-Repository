import {
  BOUNDARY_IDENTIFIERS,
  BOUNDARY_PASSWORDS,
  buildNonExistentUserCredentials,
  buildSuperAdminCredentials,
} from '@data/loginData';
import { annotateLoginTest, expect, test } from '@fixtures/login.fixture';
import {
  expectAuthenticatedShell,
  expectLoginValidationUi,
  expectOnLoginPage,
  expectProtectedRouteRedirectsToLogin,
  expectSessionPersistsAfterReload,
} from '@assertions/authAssertions';
import { captureLoginByPasswordCall, loginWithRateLimitRetry } from '@helpers/authApi';
import { LOGIN_BUSINESS_RULES } from '@constants/loginRules';

test.describe('@regression @login Login Regression', () => {
  test.beforeEach(async ({ loginPageFresh, page }) => {
    await loginPageFresh.open();
    await expectOnLoginPage(page);
  });

  test('LOGIN-REG-008 Session persists after page refresh', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_002,
      tags: ['@regression', '@login', '@session'],
    });

    const credentials = buildSuperAdminCredentials();
    const apiCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      credentials.identifier,
      credentials.password,
    );

    expect(apiCall.status).toBe(200);
    await loginPageFresh.expectLoggedIn();
    await expectSessionPersistsAfterReload(page);
  });

  test('LOGIN-REG-009 Session persists in new tab of same context', async ({
    loginPageFresh,
    page,
    context,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_002,
      tags: ['@regression', '@login', '@session'],
    });

    const credentials = buildSuperAdminCredentials();
    const apiCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      credentials.identifier,
      credentials.password,
    );

    expect(apiCall.status).toBe(200);
    await expectAuthenticatedShell(page);

    const secondTab = await context.newPage();
    await secondTab.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(secondTab.getByRole('heading', { name: /log in to continue/i })).not.toBeVisible();
    await secondTab.close();
  });

  test('LOGIN-REG-001 Empty identifier keeps user on login page', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@regression', '@login', '@validation'],
    });

    await loginPageFresh.passwordInput.fill('Password@123');
    await loginPageFresh.submitLogin();
    await expectLoginValidationUi(page, loginPageFresh);
  });

  test('LOGIN-REG-002 Empty password keeps user on login page', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@regression', '@login', '@validation'],
    });

    const credentials = buildSuperAdminCredentials();
    await loginPageFresh.identifierInput.fill(credentials.identifier);
    await loginPageFresh.submitLogin();
    await expectLoginValidationUi(page, loginPageFresh);
  });

  test('LOGIN-REG-003 Both fields empty keeps user on login page', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@regression', '@login', '@validation'],
    });

    await loginPageFresh.submitLogin();
    await expectLoginValidationUi(page, loginPageFresh);
  });

  test('LOGIN-REG-004 Non-existent user returns safe auth failure', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@regression', '@login', '@negative'],
    });

    const credentials = buildNonExistentUserCredentials();
    const apiCall = await captureLoginByPasswordCall(page, async () => {
      await loginPageFresh.login(credentials.identifier, credentials.password, {
        requireCaptchaSolution: false,
      });
    });

    expect([400, 401, 403, 404, 429]).toContain(apiCall.status);
    await expectOnLoginPage(page);
  });

  test('LOGIN-REG-005 Identifier trims leading/trailing whitespace', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P2',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_001,
      tags: ['@regression', '@login', '@boundary'],
    });

    const credentials = buildSuperAdminCredentials();
    const apiCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      `  ${credentials.identifier}  `,
      credentials.password,
    );

    expect(apiCall.status).toBe(200);
    await loginPageFresh.expectLoggedIn();
  });

  test('LOGIN-REG-006 Enter key submits login form', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P2',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_002,
      tags: ['@regression', '@login', '@ui'],
    });

    const credentials = buildSuperAdminCredentials();
    await loginPageFresh.fillCredentials(credentials.identifier, credentials.password);
    const apiCall = await captureLoginByPasswordCall(page, async () => {
      await loginPageFresh.submitLoginViaEnter();
    });

    expect([200, 429]).toContain(apiCall.status);
    if (apiCall.status === 200) {
      await loginPageFresh.expectLoggedIn();
    }
  });

  test('LOGIN-REG-007 Rapid double-click login remains stable', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P2',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_002,
      tags: ['@regression', '@login', '@race'],
    });

    const credentials = buildSuperAdminCredentials();
    await loginPageFresh.fillCredentials(credentials.identifier, credentials.password);
    await loginPageFresh.doubleClickLoginButton();

    const loggedIn = !(await loginPageFresh.isOnLoginPage());
    if (loggedIn) {
      await loginPageFresh.expectLoggedIn();
      return;
    }

    await expectOnLoginPage(page);
  });

  test('LOGIN-REG-010 Unauthenticated direct URL redirects to login', async ({ page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_008,
      tags: ['@regression', '@login', '@authorization'],
    });

    await expectProtectedRouteRedirectsToLogin(page, '/');
  });

  test('LOGIN-REG-011 Invalid email format stays on login page', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P2',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@regression', '@login', '@validation'],
    });

    await loginPageFresh.login(BOUNDARY_IDENTIFIERS.invalidEmail, BOUNDARY_PASSWORDS.short, {
      requireCaptchaSolution: false,
    });
    await expectOnLoginPage(page);
  });

  test('LOGIN-REG-012 Unicode and emoji identifiers do not break login page', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P2',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@regression', '@login', '@boundary'],
    });

    await loginPageFresh.login(BOUNDARY_IDENTIFIERS.emojiIdentifier, BOUNDARY_PASSWORDS.emoji, {
      requireCaptchaSolution: false,
    });
    await expectOnLoginPage(page);
  });
});
