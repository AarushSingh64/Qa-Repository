/** Live auth API contract captured from staging SSO backend. */
export const AUTH_API = {
  loginByPasswordPath: '/api/login/by-password',
  loginByPasswordUrlPattern: /\/api\/login\/by-password/i,
  expectedMethods: ['POST'] as const,
  requestFields: ['username', 'password', 'loginMode'] as const,
  successStatusCodes: [200] as const,
  failureStatusCodes: [400, 401, 403, 429] as const,
  successResponseFields: [
    'access_token',
    'refresh_token',
    'token_type',
    'expires_in',
    'user',
  ] as const,
  maxLatencyMs: 5_000,
} as const;

export const LOGIN_ROUTES = {
  loginPage: '/account/login',
  loginPagePattern: /\/account\/login\/?$/,
} as const;

export const LOGIN_LOCKOUT = {
  maxFailedAttempts: 5,
  lockoutDurationMs: 15_000,
} as const;

export const LOGIN_RATE_LIMIT = {
  cooldownMs: 16_000,
  statusCode: 429,
} as const;

export const LOGIN_ERROR_PATTERNS = {
  invalidCredentials: /invalid|incorrect|wrong|credentials|unauthorized|failed/i,
  captchaRequired: /captcha is required/i,
  accountLocked: /locked|too many|attempt|try again|wait/i,
  fieldRequired: /required|must not be empty|cannot be empty/i,
} as const;
