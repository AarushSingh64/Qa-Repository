import type { LocationData } from '@pages/LocationPage';

export function buildDistributionCenterData(
  overrides: Partial<Omit<LocationData, 'type'>> = {},
): Omit<LocationData, 'type'> {
  const timestamp = Date.now();

  return {
    name: `DC Automation ${timestamp}`,
    code: `DC-${timestamp}`,
    addressLine1: '456 Warehouse Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400002',
    contactPerson: `DC Manager ${timestamp}`,
    contactNumber: '9876501234',
    ...overrides,
  };
}

export function buildStoreData(
  overrides: Partial<Omit<LocationData, 'type'>> = {},
): Omit<LocationData, 'type'> {
  const timestamp = Date.now();

  return {
    name: `Store Automation ${timestamp}`,
    code: `ST-${timestamp}`,
    addressLine1: '789 Retail Avenue',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400003',
    contactPerson: `Store Manager ${timestamp}`,
    contactNumber: '9876505678',
    ...overrides,
  };
}
