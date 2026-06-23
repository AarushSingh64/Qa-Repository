import fs from 'fs';
import path from 'path';
import { test } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { TurnstileCaptchaHelper } from '@utils/captcha';

const MONITOR_SECONDS = 30;
const SCREENSHOT_INTERVAL_SECONDS = 5;
const SCREENSHOT_DIR = path.join('test-results', 'turnstile-debug');

interface TurnstileInspectionSnapshot {
  navigatorWebdriver: boolean | null;
  iframeSrcs: string[];
  siteKey: string | null;
  turnstileResponse: string;
  widgetVisible: boolean;
}

async function collectTurnstileSnapshot(
  page: import('@playwright/test').Page,
  captcha: TurnstileCaptchaHelper,
): Promise<TurnstileInspectionSnapshot> {
  const domSnapshot = await page.evaluate(() => {
    const iframeSrcs = Array.from(document.querySelectorAll('iframe'))
      .map((iframe) => iframe.getAttribute('src') ?? '')
      .filter(Boolean);

    const siteKeyElement = document.querySelector('[data-sitekey]');
    const siteKeyFromAttr = siteKeyElement?.getAttribute('data-sitekey') ?? null;

    const turnstileIframeSrc = iframeSrcs.find(
      (src) => src.includes('turnstile') || src.includes('challenges.cloudflare'),
    );
    const siteKeyFromIframe =
      turnstileIframeSrc?.match(/(0x4[A-Za-z0-9_-]+)/)?.[1] ?? null;

    const widget = document.querySelector('.cf-turnstile, [class*="turnstile"]');
    const widgetVisible = Boolean(
      widget &&
        widget instanceof HTMLElement &&
        widget.offsetParent !== null &&
        widget.getBoundingClientRect().width > 0 &&
        widget.getBoundingClientRect().height > 0,
    );

    const responseInput = document.querySelector(
      'input[name="cf-turnstile-response"]',
    ) as HTMLInputElement | null;

    return {
      navigatorWebdriver:
        typeof (navigator as Navigator & { webdriver?: boolean }).webdriver === 'boolean'
          ? (navigator as Navigator & { webdriver?: boolean }).webdriver!
          : null,
      iframeSrcs,
      siteKey: siteKeyFromAttr ?? siteKeyFromIframe,
      turnstileResponse: responseInput?.value ?? '',
      widgetVisible,
    };
  });

  const widgetLocatorVisible = await captcha.captchaWidget.first().isVisible().catch(() => false);

  return {
    ...domSnapshot,
    widgetVisible: domSnapshot.widgetVisible || widgetLocatorVisible,
  };
}

function logSnapshot(second: number, snapshot: TurnstileInspectionSnapshot, url: string): void {
  console.log(
    [
      `[turnstile-debug] t=${second}s`,
      `url=${url}`,
      `navigator.webdriver=${snapshot.navigatorWebdriver}`,
      `siteKey=${snapshot.siteKey ?? 'not-found'}`,
      `iframeCount=${snapshot.iframeSrcs.length}`,
      `cf-turnstile-response="${snapshot.turnstileResponse}"`,
      `cf-turnstile-response.length=${snapshot.turnstileResponse.length}`,
      `widgetVisible=${snapshot.widgetVisible}`,
    ].join(' | '),
  );

  if (snapshot.iframeSrcs.length > 0) {
    snapshot.iframeSrcs.forEach((src, index) => {
      console.log(`[turnstile-debug] t=${second}s iframe[${index}]=${src}`);
    });
  }
}

test.describe('@debug Turnstile', () => {
  test('turnstile-debug — inspect Cloudflare Turnstile', async ({ page }) => {
    test.setTimeout(120_000);

    const loginPage = new LoginPage(page);
    const captcha = new TurnstileCaptchaHelper(page);

    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await test.step('Open login page', async () => {
      await loginPage.open();
      console.log('[turnstile-debug] Login page opened — no login attempted');
    });

    await test.step('Log static Turnstile environment', async () => {
      const snapshot = await collectTurnstileSnapshot(page, captcha);
      console.log('[turnstile-debug] === Initial Turnstile inspection ===');
      console.log(`[turnstile-debug] navigator.webdriver=${snapshot.navigatorWebdriver}`);
      console.log(`[turnstile-debug] siteKey=${snapshot.siteKey ?? 'not-found'}`);
      console.log(`[turnstile-debug] iframeSrcs=${JSON.stringify(snapshot.iframeSrcs, null, 2)}`);
      console.log(`[turnstile-debug] widgetVisible=${snapshot.widgetVisible}`);
      console.log(
        `[turnstile-debug] cf-turnstile-response.length=${snapshot.turnstileResponse.length}`,
      );
    });

    await test.step(`Monitor Turnstile for ${MONITOR_SECONDS} seconds`, async () => {
      for (let second = 1; second <= MONITOR_SECONDS; second += 1) {
        const snapshot = await collectTurnstileSnapshot(page, captcha);
        logSnapshot(second, snapshot, page.url());

        if (second % SCREENSHOT_INTERVAL_SECONDS === 0) {
          const screenshotPath = path.join(SCREENSHOT_DIR, `turnstile-t${second}s.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`[turnstile-debug] t=${second}s screenshot=${screenshotPath}`);
        }

        if (second < MONITOR_SECONDS) {
          await page.waitForTimeout(1_000);
        }
      }
    });
  });
});
