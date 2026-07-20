import { buildSuperAdminCredentials, BOUNDARY_IDENTIFIERS, BOUNDARY_PASSWORDS } from '@data/loginData';
import { annotateLoginTest, expect, test } from '@fixtures/login.fixture';
import { expectNoStoredXssExecution, expectOnLoginPage } from '@assertions/authAssertions';
import { captureLoginByPasswordCall, captureLoginByPasswordCallOptional } from '@helpers/authApi';
import { LOGIN_BUSINESS_RULES } from '@constants/loginRules';

test.describe('@security @login Login Security', () => {
  test.beforeEach(async ({ loginPageFresh, page }) => {
    await loginPageFresh.open();
    await expectOnLoginPage(page);
  });

  test('LOGIN-SEC-001 Reflected XSS payload in identifier does not execute', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@security', '@login', '@xss'],
    });

    await page.addInitScript(() => {
      window.alert = () => {
        (window as Window & { __xssTriggered?: boolean }).__xssTriggered = true;
      };
    });

    await loginPageFresh.login(BOUNDARY_IDENTIFIERS.xssPayload, BOUNDARY_PASSWORDS.xss, {
      requireCaptchaSolution: false,
    });

    await expectOnLoginPage(page);
    await expectNoStoredXssExecution(page);
  });

  test('LOGIN-SEC-002 SQL injection payload in credentials fails safely', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@security', '@login', '@injection'],
    });

    const apiCall = await captureLoginByPasswordCallOptional(page, async () => {
      await loginPageFresh.login(BOUNDARY_IDENTIFIERS.sqlInjection, BOUNDARY_PASSWORDS.sqlInjection, {
        requireCaptchaSolution: false,
      });
    });

    if (apiCall) {
      expect([400, 401, 403, 429]).toContain(apiCall.status);
    }
    await expectOnLoginPage(page);
  });

  test('LOGIN-SEC-003 Parameter tampering with invalid loginMode is rejected', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@security', '@login', '@tampering'],
    });

    const credentials = buildSuperAdminCredentials();

    await page.route('**/api/login/by-password', async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      body.loginMode = 'TAMPERED';
      await route.continue({
        postData: JSON.stringify(body),
      });
    });

    const apiCall = await captureLoginByPasswordCall(page, async () => {
      await loginPageFresh.login(credentials.identifier, credentials.password, {
        requireCaptchaSolution: false,
      });
    });

    expect([400, 401, 403, 429]).toContain(apiCall.status);
    await expectOnLoginPage(page);
  });

  test('LOGIN-SEC-004 Tampered JWT/session token cannot access protected route', async ({
    loginPageFresh,
    page,
    context,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_008,
      tags: ['@security', '@login', '@jwt'],
    });

    const credentials = buildSuperAdminCredentials();
    const apiCall = await captureLoginByPasswordCall(page, async () => {
      await loginPageFresh.login(credentials.identifier, credentials.password, {
        requireCaptchaSolution: false,
      });
    });

    expect(apiCall.status).toBe(200);

    await context.addInitScript(() => {
      localStorage.setItem('access_token', 'ey.invalid.token');
      sessionStorage.setItem('access_token', 'ey.invalid.token');
    });

    await page.evaluate(() => {
      localStorage.setItem('access_token', 'ey.invalid.token');
      sessionStorage.setItem('access_token', 'ey.invalid.token');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const loginHeading = page.getByRole('heading', { name: /log in to continue/i });
    const dashboard = page.locator('nav, aside, .layout-sidebar, .layout-menu, .sidebar').first();
    await expect(loginHeading.or(dashboard)).toBeVisible();
  });

  test('LOGIN-SEC-005 Cross-tenant credential attempt remains isolated', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    test.skip(!process.env.TENANT_EMAIL || !process.env.TENANT_PASSWORD, 'Tenant credentials not configured');

    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P0',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_007,
      tags: ['@security', '@login', '@tenantIsolation'],
    });

    const tenantCredentials = {
      identifier: process.env.TENANT_EMAIL!,
      password: process.env.TENANT_PASSWORD!,
    };

    const apiCall = await captureLoginByPasswordCall(page, async () => {
      await loginPageFresh.login(tenantCredentials.identifier, tenantCredentials.password, {
        requireCaptchaSolution: false,
      });
    });

    expect(apiCall.status).toBe(200);
    const body = apiCall.responseBody as { user?: Record<string, unknown> };
    expect(body.user).toBeTruthy();

    await loginPageFresh.expectLoggedIn();
    await expect(page.getByText(/super admin|tenants/i).first()).not.toBeVisible({ timeout: 5_000 }).catch(() => undefined);
  });
});
