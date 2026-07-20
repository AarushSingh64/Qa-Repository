import {
  buildInvalidPasswordCredentials,
  buildSuperAdminCredentials,
  buildTenantMobileCredentials,
  buildTenantOwnerCredentials,
  buildTenantUserCredentials,
} from '@data/loginData';
import { annotateLoginTest, expect, test } from '@fixtures/login.fixture';
import {
  expectAuthenticatedShell,
  expectFailedLoginWithApi,
  expectOnLoginPage,
  expectSuccessfulLoginWithApi,
} from '@assertions/authAssertions';
import { captureLoginByPasswordCall, loginWithRateLimitRetry, redactLoginApiCall } from '@helpers/authApi';
import { LOGIN_BUSINESS_RULES } from '@constants/loginRules';

test.describe('@smoke @login @p0 Login Smoke', () => {
  test.beforeEach(async ({ loginPageFresh, page }) => {
    await loginPageFresh.open();
    await expectOnLoginPage(page);
  });

  test('LOGIN-SMOKE-001 Super Admin login validates UI and API', async ({
    loginPageFresh,
    page,
    artifactCollector,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P0',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_002,
      tags: ['@smoke', '@p0', '@login', '@superAdmin'],
    });

    const credentials = buildSuperAdminCredentials();
    const apiCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      credentials.identifier,
      credentials.password,
    );

    await testInfo.attach('login-api-redacted.json', {
      contentType: 'application/json',
      body: JSON.stringify(redactLoginApiCall(apiCall), null, 2),
    });

    await expectSuccessfulLoginWithApi(page, loginPageFresh, apiCall);
    await artifactCollector.attachToTest(testInfo);
  });

  test('LOGIN-SMOKE-002 Tenant Owner login via email validates UI and API', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    test.skip(!process.env.TENANT_EMAIL || !process.env.TENANT_PASSWORD, 'Tenant credentials not configured');

    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P0',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_001,
      tags: ['@smoke', '@p0', '@login', '@tenantOwner'],
    });

    const credentials = buildTenantOwnerCredentials();
    const apiCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      credentials.identifier,
      credentials.password,
    );

    await expectSuccessfulLoginWithApi(page, loginPageFresh, apiCall);
  });

  test('LOGIN-SMOKE-003 Tenant User login via email validates UI and API', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    test.skip(!process.env.TENANT_EMAIL || !process.env.TENANT_PASSWORD, 'Tenant credentials not configured');

    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P0',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_001,
      tags: ['@smoke', '@p0', '@login', '@tenantUser'],
    });

    const credentials = buildTenantUserCredentials();
    const apiCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      credentials.identifier,
      credentials.password,
    );

    await expectSuccessfulLoginWithApi(page, loginPageFresh, apiCall);
  });

  test('LOGIN-SMOKE-004 Tenant Owner login via mobile validates UI and API', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    const mobileCredentials = buildTenantMobileCredentials();
    test.skip(!mobileCredentials, 'TENANT_MOBILE and TENANT_PASSWORD not configured');

    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P0',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_001,
      tags: ['@smoke', '@p0', '@login', '@mobile'],
    });

    const apiCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      mobileCredentials!.identifier,
      mobileCredentials!.password,
    );

    await expectSuccessfulLoginWithApi(page, loginPageFresh, apiCall);
  });

  test('LOGIN-SMOKE-005 Invalid password shows UI error and failed auth API', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P0',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_003,
      tags: ['@smoke', '@p0', '@login', '@negative'],
    });

    const credentials = buildInvalidPasswordCredentials(buildSuperAdminCredentials());
    const apiCall = await captureLoginByPasswordCall(page, async () => {
      await loginPageFresh.login(credentials.identifier, credentials.password, {
        requireCaptchaSolution: false,
      });
    });

    await expectFailedLoginWithApi(page, loginPageFresh, apiCall, [400, 401, 403, 429]);
  });

  test('LOGIN-SMOKE-006 Logout clears session and returns to login', async ({
    loginPageFresh,
    page,
  }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P0',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_011,
      tags: ['@smoke', '@p0', '@login', '@logout'],
    });

    const credentials = buildSuperAdminCredentials();
    await loginWithRateLimitRetry(page, loginPageFresh, credentials.identifier, credentials.password);
    await loginPageFresh.expectLoggedIn();

    await loginPageFresh.logout();
    await expectOnLoginPage(page);
  });
});
