import type { Page, Request, Response } from '@playwright/test';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export interface RedactedRequest {
  url: string;
  method: string;
  matchedPattern: string;
  postDataFields?: Record<string, { type: string; strLen?: number }>;
}

export interface RedactedResponse {
  url: string;
  status: number;
  matchedPattern: string;
  contentType?: string;
  latencyMs?: number;
  jsonShape?: {
    topLevelKeys: string[];
    // Only tracks presence + primitive/string lengths to avoid leaking sensitive values.
    fieldTypes: Record<string, { type: string; strLen?: number; isNull?: boolean }>;
  };
}

export interface AuthApiObservation {
  startedAtIso: string;
  endedAtIso: string;
  matchedPatterns: string[];
  requests: RedactedRequest[];
  responses: RedactedResponse[];
}

export interface ObserveAuthCallsOptions<T> {
  action: () => Promise<T>;
  // Regex patterns to decide which requests/responses are "login/auth" candidates.
  urlPatterns?: RegExp[];
  // Limit how many response bodies we attempt to parse as JSON (keeps things fast).
  maxJsonResponsesToParse?: number;
  // Wait after action completes so late response events are still captured.
  postActionWaitMs?: number;
}

function redactPostData(postData: string): Record<string, { type: string; strLen?: number }> | undefined {
  const trimmed = postData.trim();
  if (!trimmed) return undefined;

  // Best-effort JSON redaction only (most auth calls are JSON on modern stacks).
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const fields: Record<string, { type: string; strLen?: number }> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('password')) {
          fields[key] = { type: 'redacted-string' };
          continue;
        }

        if (typeof value === 'string') {
          fields[key] = { type: 'string', strLen: value.length };
        } else if (typeof value === 'number') {
          fields[key] = { type: 'number' };
        } else if (typeof value === 'boolean') {
          fields[key] = { type: 'boolean' };
        } else if (value === null) {
          fields[key] = { type: 'null', isNull: true };
        } else {
          fields[key] = { type: Array.isArray(value) ? 'array' : typeof value };
        }
      }
      return fields;
    }
  } catch {
    // Not JSON; fall through.
  }

  return { raw: { type: 'non-json-or-unparsed', strLen: trimmed.length } };
}

function summarizeJsonShape(json: unknown): AuthApiObservation['responses'][number]['jsonShape'] | undefined {
  if (!json || typeof json !== 'object') return undefined;

  if (Array.isArray(json)) {
    return { topLevelKeys: [], fieldTypes: { '*': { type: 'array' } } };
  }

  const obj = json as Record<string, unknown>;
  const topLevelKeys = Object.keys(obj);
  const fieldTypes: Record<string, { type: string; strLen?: number; isNull?: boolean }> = {};

  for (const key of topLevelKeys) {
    const value = obj[key];
    const lower = key.toLowerCase();
    if (lower.includes('token') || lower.includes('password')) {
      fieldTypes[key] = { type: 'redacted-string' };
      continue;
    }

    if (typeof value === 'string') {
      fieldTypes[key] = { type: 'string', strLen: value.length };
    } else if (typeof value === 'number') {
      fieldTypes[key] = { type: 'number' };
    } else if (typeof value === 'boolean') {
      fieldTypes[key] = { type: 'boolean' };
    } else if (value === null) {
      fieldTypes[key] = { type: 'null', isNull: true };
    } else {
      fieldTypes[key] = { type: Array.isArray(value) ? 'array' : typeof value };
    }
  }

  return { topLevelKeys, fieldTypes };
}

function findMatchedPattern(url: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    if (pattern.test(url)) return pattern.toString();
  }
  return null;
}

export async function observeAuthCalls<T>(
  page: Page,
  options: ObserveAuthCallsOptions<T>,
): Promise<{ result: T; observation: AuthApiObservation }> {
  const urlPatterns = options.urlPatterns ?? [
    /\/account\/login/i,
    /\/auth\/login/i,
    /\/login/i,
    /\/token/i,
    /\/session/i,
    /signin|sign-in/i,
  ];

  const maxJsonResponsesToParse = options.maxJsonResponsesToParse ?? 5;
  const postActionWaitMs = options.postActionWaitMs ?? 1500;

  const requests: RedactedRequest[] = [];
  const responses: RedactedResponse[] = [];
  let jsonResponsesParsed = 0;

  const startedAtIso = new Date().toISOString();

  const onRequest = (request: Request): void => {
    const url = request.url();
    const matchedPattern = findMatchedPattern(url, urlPatterns);
    if (!matchedPattern) return;

    const method = request.method();
    if (method !== 'POST' && method !== 'PUT') return;

    requests.push({
      url,
      method,
      matchedPattern,
      postDataFields: request.postData() ? redactPostData(request.postData() ?? '') : undefined,
    });
  };

  const onResponse = async (response: Response): Promise<void> => {
    const url = response.url();
    const matchedPattern = findMatchedPattern(url, urlPatterns);
    if (!matchedPattern) return;

    const req = response.request();
    const method = req.method();
    if (method !== 'POST' && method !== 'PUT') return;

    const headers = response.headers();
    const contentType = headers['content-type'];

    // Playwright exposes timing on Request objects; use that to compute end-to-end latency.
    const timing = req.timing();
    const latencyMs = timing && typeof timing.responseEnd === 'number' && typeof timing.startTime === 'number'
      ? timing.responseEnd - timing.startTime
      : undefined;

    const redacted: RedactedResponse = {
      url,
      status: response.status(),
      matchedPattern,
      contentType,
      latencyMs,
    };

    // Parse JSON body only for a small number of candidate responses.
    if (jsonResponsesParsed < maxJsonResponsesToParse && contentType?.includes('application/json')) {
      jsonResponsesParsed += 1;
      try {
        const json = await response.json();
        redacted.jsonShape = summarizeJsonShape(json);
      } catch {
        // Ignore non-JSON responses or parsing errors.
      }
    }

    responses.push(redacted);
  };

  page.on('request', onRequest);
  page.on('response', onResponse);

  try {
    const result = await options.action();
    if (postActionWaitMs > 0) {
      await page.waitForTimeout(postActionWaitMs);
    }
    const endedAtIso = new Date().toISOString();
    return {
      result,
      observation: {
        startedAtIso,
        endedAtIso,
        matchedPatterns: urlPatterns.map((p) => p.toString()),
        requests,
        responses,
      },
    };
  } finally {
    page.off('request', onRequest);
    page.off('response', onResponse);
  }
}

