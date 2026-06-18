import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { getPersistentContextOptions, PROFILE_DIR } from '@utils/auth';

/**
 * Worker-scoped persistent Chrome profile.
 * Reuses cookies and local storage between test runs — no login UI, no captcha automation.
 */
export const test = base.extend<{}, { persistentContext: BrowserContext }>({
  persistentContext: [
    async ({}, use) => {
      const context = await chromium.launchPersistentContext(
        PROFILE_DIR,
        getPersistentContextOptions(),
      );

      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  context: async ({ persistentContext }, use) => {
    await use(persistentContext);
  },

  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

export { expect } from '@playwright/test';
