import { expect, type APIResponse, type Page } from '@playwright/test';
import { AUTH_API, LOGIN_RATE_LIMIT } from '@constants/auth';
import type { LoginPage } from '@pages/LoginPage';

export interface LoginApiRequestShape {
  username?: string;
  password?: string;
  loginMode?: string;
}

export interface LoginApiSuccessBody {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: Record<string, unknown>;
}

export interface LoginApiFailureBody {
  message?: string;
  error?: string;
  title?: string;
  status?: number;
  errors?: unknown;
}

export interface CapturedLoginApiCall {
  url: string;
  method: string;
  status: number;
  latencyMs: number;
  requestBody: LoginApiRequestShape;
  responseBody: LoginApiSuccessBody | LoginApiFailureBody | unknown;
  responseHeaders: Record<string, string>;
}

function isLoginByPasswordResponse(response: APIResponse): boolean {
  return (
    AUTH_API.loginByPasswordUrlPattern.test(response.url()) &&
    response.request().method() === 'POST'
  );
}

async function parseJsonBody(response: APIResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function captureLoginByPasswordCall(
  page: Page,
  action: () => Promise<void>,
  timeoutMs = 20_000,
): Promise<CapturedLoginApiCall> {
  const startedAt = Date.now();

  const responsePromise = page.waitForResponse(isLoginByPasswordResponse, { timeout: timeoutMs });
  await action();
  const response = await responsePromise;

  const requestBody = JSON.parse(response.request().postData() ?? '{}') as LoginApiRequestShape;
  const responseBody = await parseJsonBody(response);

  return {
    url: response.url(),
    method: response.request().method(),
    status: response.status(),
    latencyMs: Date.now() - startedAt,
    requestBody,
    responseBody,
    responseHeaders: response.headers(),
  };
}

export async function captureLoginByPasswordCallOptional(
  page: Page,
  action: () => Promise<void>,
  timeoutMs = 20_000,
): Promise<CapturedLoginApiCall | null> {
  try {
    return await captureLoginByPasswordCall(page, action, timeoutMs);
  } catch {
    return null;
  }
}

export async function loginWithRateLimitRetry(
  page: Page,
  loginPage: LoginPage,
  identifier: string,
  password: string,
  options: { maxAttempts?: number; cooldownMs?: number } = {},
): Promise<CapturedLoginApiCall> {
  const maxAttempts = options.maxAttempts ?? 3;
  const cooldownMs = options.cooldownMs ?? LOGIN_RATE_LIMIT.cooldownMs;

  let lastCall: CapturedLoginApiCall | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      await loginPage.open();
    }

    lastCall = await captureLoginByPasswordCall(page, async () => {
      await loginPage.login(identifier, password, { requireCaptchaSolution: false });
    });

    if (lastCall.status !== 429 || attempt === maxAttempts) {
      return lastCall;
    }

    await page.waitForTimeout(cooldownMs);
  }

  return lastCall!;
}

export function assertLoginApiRequestContract(apiCall: CapturedLoginApiCall): void {
  expect(apiCall.url).toMatch(AUTH_API.loginByPasswordUrlPattern);
  expect(apiCall.method).toBe('POST');
  expect(apiCall.requestBody.username).toBeTruthy();
  expect(apiCall.requestBody.password).toBeTruthy();
  expect(apiCall.requestBody.loginMode).toBeTruthy();
}

export function assertLoginApiSuccessContract(apiCall: CapturedLoginApiCall): void {
  assertLoginApiRequestContract(apiCall);
  expect(AUTH_API.successStatusCodes).toContain(apiCall.status);
  expect(apiCall.latencyMs).toBeLessThan(AUTH_API.maxLatencyMs);

  const body = apiCall.responseBody as LoginApiSuccessBody;
  for (const field of AUTH_API.successResponseFields) {
    expect(body[field as keyof LoginApiSuccessBody]).toBeTruthy();
  }

  expect(typeof body.expires_in).toBe('number');
  expect(body.expires_in).toBeGreaterThan(0);
}

export function assertLoginApiFailureContract(
  apiCall: CapturedLoginApiCall,
  expectedStatuses: readonly number[] = AUTH_API.failureStatusCodes,
): void {
  assertLoginApiRequestContract(apiCall);
  expect(expectedStatuses).toContain(apiCall.status);
}

export function redactLoginApiCall(apiCall: CapturedLoginApiCall): Record<string, unknown> {
  return {
    url: apiCall.url,
    method: apiCall.method,
    status: apiCall.status,
    latencyMs: apiCall.latencyMs,
    requestFields: {
      usernameLength: apiCall.requestBody.username?.length ?? 0,
      passwordPresent: Boolean(apiCall.requestBody.password),
      loginMode: apiCall.requestBody.loginMode,
    },
    responseTopLevelKeys:
      apiCall.responseBody && typeof apiCall.responseBody === 'object'
        ? Object.keys(apiCall.responseBody as Record<string, unknown>)
        : [],
  };
}
