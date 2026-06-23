import { test } from '../fixtures/auth.fixture';
import { buildTenantData } from '@data/tenantData';
import { LoginPage } from '@pages/LoginPage';
import { TenantPage } from '@pages/TenantPage';

test.describe('@tenant Tenant Creation', () => {
  test('TENANT-001 Create Tenant as Super Admin', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const tenantPage = new TenantPage(page);
    const tenantData = buildTenantData();

    await test.step('Verify authenticated session', async () => {
      await page.goto('/');
      await loginPage.expectLoggedIn();
    });

    await test.step('Open Tenant Page', async () => {
      await tenantPage.open();
    });

    await test.step('Create Tenant', async () => {
      await tenantPage.startCreateTenant();
      await tenantPage.fillTenantForm(tenantData);
      await tenantPage.saveButton.click();
      await tenantPage.waitForPageReady();
    });

    await test.step('Verify Tenant Created', async () => {
      await tenantPage.expectTenantCreated(tenantData.businessName);
    });
  });
});
