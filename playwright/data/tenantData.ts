import type { TenantData } from '@pages/TenantPage';

export interface OnboardingTestContext {
  tenantData: TenantData;
  tempPassword: string;
  permanentPassword: string;
}

export function buildTenantData(overrides: Partial<TenantData> = {}): TenantData {
  const timestamp = Date.now();

  return {
    businessName: `Capital POS Tenant ${timestamp}`,
    ownerName: `Test Owner ${timestamp}`,
    ownerEmail: `capitalpos-${timestamp}@yopmail.com`,
    ownerMobile: '9876543210',
    addressLine1: '123 Automation Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    ...overrides,
  };
}

export function buildPermanentPassword(): string {
  return `Tenant@Pass${Date.now()}`;
}

export function createOnboardingContext(
  overrides: Partial<TenantData> = {},
): OnboardingTestContext {
  return {
    tenantData: buildTenantData(overrides),
    tempPassword: '',
    permanentPassword: buildPermanentPassword(),
  };
}
