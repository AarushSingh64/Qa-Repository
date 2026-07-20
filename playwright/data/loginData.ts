import { getEnvConfig } from '@utils/env';

export interface LoginCredentials {
  identifier: string;
  password: string;
  persona: 'superAdmin' | 'tenantOwner' | 'tenantUser';
  channel: 'email' | 'mobile';
}

export function buildSuperAdminCredentials(): LoginCredentials {
  const env = getEnvConfig();
  return {
    identifier: env.superAdminEmail,
    password: env.superAdminPassword,
    persona: 'superAdmin',
    channel: 'email',
  };
}

export function buildTenantOwnerCredentials(): LoginCredentials {
  const env = getEnvConfig();
  if (!env.tenantEmail || !env.tenantPassword) {
    throw new Error('TENANT_EMAIL and TENANT_PASSWORD are required for tenant owner login tests.');
  }

  return {
    identifier: env.tenantEmail,
    password: env.tenantPassword,
    persona: 'tenantOwner',
    channel: 'email',
  };
}

export function buildTenantUserCredentials(): LoginCredentials {
  const env = getEnvConfig();
  const userEmail = env.tenantUserEmail ?? env.tenantEmail;
  const userPassword = env.tenantUserPassword ?? env.tenantPassword;

  if (!userEmail || !userPassword) {
    throw new Error(
      'TENANT_USER_EMAIL/TENANT_EMAIL and TENANT_USER_PASSWORD/TENANT_PASSWORD are required for tenant user login tests.',
    );
  }

  return {
    identifier: userEmail,
    password: userPassword,
    persona: 'tenantUser',
    channel: 'email',
  };
}

export function buildTenantMobileCredentials(): LoginCredentials | null {
  const env = getEnvConfig();
  if (!env.tenantMobile || !env.tenantPassword) {
    return null;
  }

  return {
    identifier: env.tenantMobile,
    password: env.tenantPassword,
    persona: 'tenantOwner',
    channel: 'mobile',
  };
}

export function buildInvalidPasswordCredentials(
  base: LoginCredentials,
  invalidPassword = 'InvalidPassword@123',
): LoginCredentials {
  return { ...base, password: invalidPassword };
}

export function buildNonExistentUserCredentials(): LoginCredentials {
  const suffix = Date.now().toString().slice(-8);
  return {
    identifier: `nonexistent-${suffix}@yopmail.com`,
    password: 'InvalidPassword@123',
    persona: 'tenantUser',
    channel: 'email',
  };
}

export const BOUNDARY_IDENTIFIERS = {
  empty: '',
  whitespace: '   ',
  invalidEmail: 'not-an-email',
  invalidMobile: '123',
  unicodeEmail: 'tëstüser@yopmail.com',
  emojiIdentifier: 'user😀@yopmail.com',
  sqlInjection: "' OR '1'='1",
  xssPayload: '<script>alert(1)</script>@test.com',
  longString: `${'a'.repeat(256)}@yopmail.com`,
} as const;

export const BOUNDARY_PASSWORDS = {
  empty: '',
  whitespace: '   ',
  short: 'Ab1!',
  unicode: 'Pässwörd@123',
  emoji: 'Password😀@123',
  xss: '<img src=x onerror=alert(1)>',
  sqlInjection: "' OR '1'='1' --",
  long: `P@${'a'.repeat(256)}1`,
} as const;
