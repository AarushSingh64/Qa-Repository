/**
 * Login module business rules codified for automation assertions.
 * Source: stakeholder input + live staging behavior + docs/business-flow.md (BR-013..BR-014, BR-045..BR-048).
 */
export const LOGIN_BUSINESS_RULES = {
  BR_LOGIN_001: 'Users authenticate with email or mobile plus password.',
  BR_LOGIN_002: 'Successful login redirects away from /account/login to authenticated shell.',
  BR_LOGIN_003: 'Invalid credentials keep user on login page and return safe error messaging.',
  BR_LOGIN_004: 'Mandatory password reset intercepts first login with temporary password.',
  BR_LOGIN_005: 'Deactivated tenant blocks tenant and user login (UI + API).',
  BR_LOGIN_006: 'Deactivated user cannot login.',
  BR_LOGIN_007: 'Tenant A session/credentials must not access Tenant B data.',
  BR_LOGIN_008: 'RBAC enforcement applies after authentication (UI + API + direct URL).',
  BR_LOGIN_009: 'No OTP/MFA in current login scope.',
  BR_LOGIN_010: 'After 5 failed attempts account locks for 15 seconds.',
  BR_LOGIN_011: 'Logout clears authenticated session and returns to login page.',
  BR_LOGIN_012: 'Cloudflare Turnstile may gate login when enabled in environment.',
} as const;

export type LoginPersona = 'superAdmin' | 'tenantOwner' | 'tenantUser';
