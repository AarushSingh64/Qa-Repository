import { test } from '@playwright/test';
import { buildTenantData } from '@data/tenantData';
import { TenantPage } from '@pages/TenantPage';
import { ensureSuperAdminSession } from '@utils/session';

test.describe('@tenant Tenant Creation', () => {
  test('TENANT-001 Create Tenant as Super Admin', async ({ page }) => {
    const tenantPage = new TenantPage(page);
    const tenantData = buildTenantData();

    await test.step('Verify authenticated session', async () => {
      await ensureSuperAdminSession(page);
    });

    await test.step('Open Tenant Page', async () => {
      await tenantPage.open();
    });

    await test.step('Create Tenant', async () => {
      await tenantPage.createTenantOrReuse(tenantData);
    });

    await test.step('Verify Tenant Created', async () => {
      await tenantPage.expectTenantVisible(tenantData.brandName);
    });
  });
});
