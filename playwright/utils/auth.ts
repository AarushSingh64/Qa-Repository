import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { isHeadedMode } from './env';

export const PROFILE_DIR = path.join(__dirname, '..', '.profile', 'superadmin');
const BASE_URL_MARKER = path.join(PROFILE_DIR, '.base-url');

export type PersistentContextOptions = NonNullable<
  Parameters<typeof chromium.launchPersistentContext>[1]
>;

export function profileExists(): boolean {
  return fs.existsSync(PROFILE_DIR);
}

export function readStoredBaseUrl(): string | null {
  try {
    return fs.readFileSync(BASE_URL_MARKER, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

export function writeStoredBaseUrl(url: string): void {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  fs.writeFileSync(BASE_URL_MARKER, url);
}

export function isProfileValidForCurrentBaseUrl(): boolean {
  return readStoredBaseUrl() === resolveBaseUrl();
}

export function resolveBaseUrl(): string {
  const raw = process.env.BASE_URL?.trim();

  if (!raw) {
    throw new Error('BASE_URL environment variable is required.');
  }

  return new URL(raw).origin;
}

export function getPersistentContextOptions(): PersistentContextOptions {
  return {
    channel: 'chrome',
    headless: !isHeadedMode(),
    baseURL: resolveBaseUrl(),
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  };
}
