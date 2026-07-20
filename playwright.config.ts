import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { isHeadedMode } from './playwright/utils/env';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const isCI = Boolean(process.env.CI);

function resolveBaseUrl(): string {
  const raw = process.env.BASE_URL?.trim();

  if (!raw) {
    throw new Error(
      'BASE_URL environment variable is required. Copy .env.example to .env and set BASE_URL.',
    );
  }

  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(`BASE_URL is invalid: "${raw}"`);
  }
}

export default defineConfig({
  testDir: path.join(__dirname, 'playwright', 'tests'),
  outputDir: path.join(__dirname, 'test-results'),
  globalSetup: path.join(__dirname, 'playwright', 'global-setup.ts'),

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 1 : undefined,

  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }],
    ['json', { outputFile: path.join(__dirname, 'playwright-report', 'results.json') }],
    ['junit', { outputFile: path.join(__dirname, 'playwright-report', 'results.xml') }],
  ],

  use: {
    baseURL: resolveBaseUrl(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    headless: !isHeadedMode(),
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'login',
      testMatch: /login\/.*\.spec\.ts/,
      testIgnore: /login\.lockout\.spec\.ts/,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'login-lockout',
      testMatch: /login\.lockout\.spec\.ts/,
      workers: 1,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
      },
    },
    {
      name: 'debug',
      testMatch: /turnstile-(debug|diagnostic)\.spec\.ts/,
      retries: 0,
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
      },
    },
    {
      name: 'smoke',
      testMatch: /smoke\/.*\.spec\.ts/,
      workers: 1,
      retries: isCI ? 1 : 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'authenticated',
      testMatch: /tenant-create\.spec\.ts/,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
