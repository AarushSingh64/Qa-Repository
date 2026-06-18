import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

export const PROFILE_DIR = path.join(__dirname, '..', '.profile', 'superadmin');

export type PersistentContextOptions = NonNullable<
  Parameters<typeof chromium.launchPersistentContext>[1]
>;

export function profileExists(): boolean {
  return fs.existsSync(PROFILE_DIR);
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
    headless: process.env.HEADED !== 'true',
    baseURL: resolveBaseUrl(),
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  };
}
