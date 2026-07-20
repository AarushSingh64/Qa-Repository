import { buildDistributionCenterData, buildStoreData } from '@data/locationData';
import { createOnboardingContext } from '@data/tenantData';
import { buildRoleData, buildUserData } from '@data/userData';
import { test } from '@fixtures/testFixtures';
import { YopmailHelper } from '@utils/YopmailHelper';
import { ensureSuperAdminSession } from '@utils/session';

test.describe.serial('@smoke @onboarding Tenant Onboarding', () => {
  const dcData = buildDistributionCenterData();
  const storeData = buildStoreData();
  const roleData = buildRoleData();
  const userData = buildUserData();

  test('ONBOARDING-001 Full tenant onboarding flow', async ({
    page,
    loginPage,
    tenantPage,
    passwordResetPage,
    locationPage,
    rolePage,
    userPage,
  }) => {
    test.setTimeout(300_000);
    const onboarding = createOnboardingContext();

    await test.step('Super Admin logs in', async () => {
      await ensureSuperAdminSession(page);
    });

    await test.step('Super Admin creates tenant', async () => {
      await tenantPage.createTenantOrReuse(onboarding.tenantData);
    });

    await test.step('Retrieve temporary password from Yopmail', async () => {
      const yopmailPage = await page.context().newPage();
      const yopmailTab = new YopmailHelper(yopmailPage);

      try {
        onboarding.tempPassword = await yopmailTab.waitForTemporaryPassword(
          onboarding.tenantData.email,
        );
      } finally {
        await yopmailPage.close();
      }

      test.info().annotations.push({
        type: 'credentials',
        description: `Temporary password retrieved for ${onboarding.tenantData.email}`,
      });
    });

    await test.step('Super Admin logs out', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      if (!(await loginPage.isOnLoginPage())) {
        await loginPage.logout();
      }
      await loginPage.expectLoggedOut();
    });

    await test.step('Tenant logs in with temporary password', async () => {
      await loginPage.open();
      await loginPage.loginAsTenant(
        onboarding.tenantData.email,
        onboarding.tempPassword,
        { requireCaptchaSolution: false },
      );
      await passwordResetPage.expectVisible();
    });

    await test.step('Tenant completes mandatory password reset', async () => {
      onboarding.permanentPassword = 'Password@123';
      await passwordResetPage.resetPassword({
        currentPassword: onboarding.tempPassword,
        newPassword: onboarding.permanentPassword,
      });
      await passwordResetPage.expectPasswordResetComplete();
    });

    await test.step('Tenant creates Distribution Center', async () => {
      await locationPage.createDistributionCenter(dcData);
      await locationPage.expectLocationCreated(dcData.name, 'Distribution Center');
    });

    await test.step('Tenant creates Store', async () => {
      await locationPage.createStore(storeData);
      await locationPage.expectLocationCreated(storeData.name, 'Store');
    });

    await test.step('Tenant creates role', async () => {
      await rolePage.createRole(roleData);
      await rolePage.expectRoleCreated(roleData.name);
    });

    await test.step('Tenant creates user', async () => {
      await userPage.createUser(userData);
      await userPage.expectUserCreated(userData.name);
    });

    await test.step('Tenant assigns role and locations to user', async () => {
      await userPage.assignRoleAndLocations(userData.name, {
        roleName: roleData.name,
        locationNames: [dcData.name, storeData.name],
      });
      await userPage.expectUserAssignment(userData.name, {
        roleName: roleData.name,
        locationNames: [dcData.name, storeData.name],
      });
    });
  });
});
