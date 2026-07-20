import { buildSuperAdminCredentials } from '@data/loginData';
import { annotateLoginTest, test } from '@fixtures/login.fixture';
import { observeAuthCalls } from '@utils/authApiIntrospector';
import { LOGIN_BUSINESS_RULES } from '@constants/loginRules';

const shouldIntrospectApiContract = process.env.AUTH_INTROSPECT?.trim().toLowerCase() === 'true';

test.describe('@login @api-contract Login API Contract', () => {
  test('LOGIN-API-001 Auth API contract discovery (opt-in)', async ({ loginPageFresh, page }, testInfo) => {
    test.skip(!shouldIntrospectApiContract, 'Set AUTH_INTROSPECT=true to run contract discovery');

    annotateLoginTest(testInfo, {
      module: 'Login',
      priority: 'P2',
      businessRule: LOGIN_BUSINESS_RULES.BR_LOGIN_002,
      tags: ['@login', '@api-contract'],
    });

    await loginPageFresh.open();
    const credentials = buildSuperAdminCredentials();

    const { observation } = await observeAuthCalls(page, {
      action: async () => {
        await loginPageFresh.login(credentials.identifier, credentials.password, {
          requireCaptchaSolution: false,
        });
      },
    });

    await testInfo.attach('auth-api-observation.json', {
      contentType: 'application/json',
      body: JSON.stringify(observation, null, 2),
    });

    await loginPageFresh.expectLoggedIn();
  });
});
