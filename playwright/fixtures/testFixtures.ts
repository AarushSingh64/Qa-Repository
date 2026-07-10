import { test as base } from '@playwright/test';
import { LocationPage } from '@pages/LocationPage';
import { LoginPage } from '@pages/LoginPage';
import { PasswordResetPage } from '@pages/PasswordResetPage';
import { RolePage } from '@pages/RolePage';
import { TenantPage } from '@pages/TenantPage';
import { UserPage } from '@pages/UserPage';
import { YopmailHelper } from '@utils/YopmailHelper';

type PageObjectFixtures = {
  loginPage: LoginPage;
  tenantPage: TenantPage;
  locationPage: LocationPage;
  rolePage: RolePage;
  userPage: UserPage;
  passwordResetPage: PasswordResetPage;
  yopmail: YopmailHelper;
};

export const test = base.extend<PageObjectFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  tenantPage: async ({ page }, use) => {
    await use(new TenantPage(page));
  },
  locationPage: async ({ page }, use) => {
    await use(new LocationPage(page));
  },
  rolePage: async ({ page }, use) => {
    await use(new RolePage(page));
  },
  userPage: async ({ page }, use) => {
    await use(new UserPage(page));
  },
  passwordResetPage: async ({ page }, use) => {
    await use(new PasswordResetPage(page));
  },
  yopmail: async ({ page }, use) => {
    await use(new YopmailHelper(page));
  },
});

export { expect } from '@playwright/test';
