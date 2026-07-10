import type { RoleData } from '@pages/RolePage';
import type { UserData } from '@pages/UserPage';

export function buildRoleData(overrides: Partial<RoleData> = {}): RoleData {
  const timestamp = Date.now();

  return {
    name: `Smoke Role ${timestamp}`,
    description: 'Automation smoke role with minimal permissions',
    permissions: ['view', 'dashboard'],
    ...overrides,
  };
}

export function buildUserData(overrides: Partial<UserData> = {}): UserData {
  const timestamp = Date.now();

  return {
    name: `Smoke User ${timestamp}`,
    email: `capitalpos-user-${timestamp}@yopmail.com`,
    mobile: '9876512345',
    ...overrides,
  };
}
