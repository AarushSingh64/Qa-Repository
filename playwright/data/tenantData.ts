import type { TenantData } from '@pages/TenantPage';

export interface OnboardingTestContext {
  tenantData: TenantData;
  tempPassword: string;
  permanentPassword: string;
}

function toAlphaSuffix(value: number, length = 8): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let current = value;
  let suffix = '';

  for (let index = 0; index < length; index += 1) {
    suffix = alphabet[current % alphabet.length] + suffix;
    current = Math.floor(current / alphabet.length);
  }

  return suffix;
}

export function buildTenantData(overrides: Partial<TenantData> = {}): TenantData {
  const timestamp = Date.now();
  const suffix = String(timestamp).slice(-8);
  const alphaSuffix = toAlphaSuffix(timestamp);

  return {
    firstName: 'Test',
    lastName: `Owner${alphaSuffix}`,
    email: `capitalpos-${suffix}@yopmail.com`,
    mobile: `98${suffix}`,
    brandName: `Capital POS ${alphaSuffix}`,
    subDomain: `cp${suffix}`,
    hasGstin: true,
    gstin: '07CJXPK5497H5Z6',
    addressLine1: '123 Automation Street',
    postalCode: '400001',
    ...overrides,
  };
}

export function buildPermanentPassword(): string {
  return 'Password@123';
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
