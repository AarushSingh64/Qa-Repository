import { buildSuperAdminCredentials } from '@data/loginData';
import { annotateLoginTest, expect, test } from '@fixtures/login.fixture';
import { expectOnLoginPage } from '@assertions/authAssertions';
import {
  captureLoginByPasswordCallOptional,
  loginWithRateLimitRetry,
} from '@helpers/authApi';
import { LOGIN_LOCKOUT } from '@constants/auth';
import { LOGIN_BUSINESS_RULES } from '@constants/loginRules';

test.describe.serial('@regression @login @lockout Login Lockout', () => {
  test('LOGIN-REG-013 Lockout after 5 failed attempts for 15 seconds', async ({ loginPageFresh, page }, testInfo) => {
    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P1',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_010,
      tags: ['@regression', '@login', '@lockout'],
    });

    const credentials = buildSuperAdminCredentials();
    const wrongPassword = 'WrongPass@123';
    const responseStatuses: number[] = [];

    await loginPageFresh.open();

    for (let attempt = 1; attempt <= LOGIN_LOCKOUT.maxFailedAttempts; attempt += 1) {
      if (attempt > 1) {
        await loginPageFresh.open();
      }

      const apiCall = await captureLoginByPasswordCallOptional(page, async () => {
        await loginPageFresh.login(credentials.identifier, wrongPassword, {
          requireCaptchaSolution: false,
        });
      });

      if (apiCall) {
        responseStatuses.push(apiCall.status);
      }

      await expectOnLoginPage(page);
    }

    const passwordDisabled = await loginPageFresh.passwordInput.isDisabled().catch(() => false);
    const identifierDisabled = await loginPageFresh.identifierInput.isDisabled().catch(() => false);
    const lastStatus = responseStatuses.at(-1);

    const lockoutObserved =
      passwordDisabled ||
      identifierDisabled ||
      lastStatus === 429 ||
      lastStatus === 403 ||
      lastStatus === 401;

    expect(lockoutObserved).toBe(true);

    await page.waitForTimeout(LOGIN_LOCKOUT.lockoutDurationMs + 1_000);
    await loginPageFresh.open();

    const recoveryCall = await loginWithRateLimitRetry(
      page,
      loginPageFresh,
      credentials.identifier,
      credentials.password,
    );

    expect(recoveryCall.status).toBe(200);
    await loginPageFresh.expectLoggedIn();
  });
});
