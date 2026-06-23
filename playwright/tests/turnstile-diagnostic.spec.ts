import type { Page } from '@playwright/test';
import { test } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import {
  buildTurnstileDiagnosticReport,
  type ConsoleLogRecord,
  type DomSnapshot,
  type FailedRequestRecord,
  type NetworkRequestRecord,
  printTurnstileDiagnosticSummary,
  writeTurnstileDiagnosticReport,
} from '@utils/turnstile-diagnostic';

const OBSERVATION_SECONDS = 30;

async function collectDomSnapshot(page: Page): Promise<DomSnapshot> {
  return page.evaluate(() => {
    const iframeSrcs = Array.from(document.querySelectorAll('iframe'))
      .map((iframe) => iframe.getAttribute('src') ?? '')
      .filter(Boolean);

    const scriptSrcs = Array.from(document.querySelectorAll('script[src]'))
      .map((script) => script.getAttribute('src') ?? '')
      .filter(Boolean);

    const dataSitekeyElements = Array.from(document.querySelectorAll('[data-sitekey]')).map(
      (element) => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        return {
          tagName: htmlElement.tagName.toLowerCase(),
          id: htmlElement.id,
          className: htmlElement.className,
          siteKey: htmlElement.getAttribute('data-sitekey') ?? '',
          visible: rect.width > 0 && rect.height > 0 && htmlElement.offsetParent !== null,
          outerHTMLSnippet: htmlElement.outerHTML.slice(0, 240),
        };
      },
    );

    const widgetSelectors = ['.cf-turnstile', '[class*="turnstile"]', 'iframe[src*="turnstile"]'];
    const widgetSelectorsFound = widgetSelectors.filter((selector) =>
      Boolean(document.querySelector(selector)),
    );

    const responseInput = document.querySelector(
      'input[name="cf-turnstile-response"]',
    ) as HTMLInputElement | null;

    return {
      iframeSrcs,
      scriptSrcs,
      dataSitekeyElements,
      cfTurnstileResponsePresent: Boolean(responseInput),
      cfTurnstileResponseLength: responseInput?.value.length ?? 0,
      widgetSelectorsFound,
      navigatorWebdriver:
        typeof (navigator as Navigator & { webdriver?: boolean }).webdriver === 'boolean'
          ? (navigator as Navigator & { webdriver?: boolean }).webdriver!
          : null,
    };
  });
}

function attachNetworkListeners(
  page: Page,
  allRequests: NetworkRequestRecord[],
  failedRequests: FailedRequestRecord[],
): void {
  page.on('request', (request) => {
    allRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      timestamp: new Date().toISOString(),
    });
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText ?? 'unknown error',
      timestamp: new Date().toISOString(),
    });
  });
}

function attachConsoleListeners(page: Page, consoleLogs: ConsoleLogRecord[]): void {
  page.on('console', (message) => {
    consoleLogs.push({
      type: message.type(),
      text: message.text(),
      timestamp: new Date().toISOString(),
    });
  });

  page.on('pageerror', (error) => {
    consoleLogs.push({
      type: 'pageerror',
      text: error.message,
      timestamp: new Date().toISOString(),
    });
  });
}

test.describe('@debug Turnstile Diagnostic', () => {
  test('turnstile-diagnostic — explain why Turnstile is not initialized', async ({ page }) => {
    test.setTimeout(180_000);

    const allRequests: NetworkRequestRecord[] = [];
    const failedRequests: FailedRequestRecord[] = [];
    const consoleLogs: ConsoleLogRecord[] = [];
    const pageErrors: string[] = [];

    attachNetworkListeners(page, allRequests, failedRequests);
    attachConsoleListeners(page, consoleLogs);
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const loginPage = new LoginPage(page);

    await test.step('Open login page (no login attempted)', async () => {
      await loginPage.open();
      console.log('[turnstile-diagnostic] Login page opened');
    });

    await test.step(`Observe page for ${OBSERVATION_SECONDS} seconds`, async () => {
      for (let second = 1; second <= OBSERVATION_SECONDS; second += 1) {
        const dom = await collectDomSnapshot(page);
        console.log(
          [
            `[turnstile-diagnostic] t=${second}s`,
            `webdriver=${dom.navigatorWebdriver}`,
            `sitekeyElements=${dom.dataSitekeyElements.length}`,
            `iframeCount=${dom.iframeSrcs.length}`,
            `tokenLength=${dom.cfTurnstileResponseLength}`,
            `requests=${allRequests.length}`,
            `failedRequests=${failedRequests.length}`,
          ].join(' | '),
        );

        if (second < OBSERVATION_SECONDS) {
          await page.waitForTimeout(1_000);
        }
      }
    });

    const dom = await collectDomSnapshot(page);
    const report = buildTurnstileDiagnosticReport({
      pageUrl: page.url(),
      observationWindowSeconds: OBSERVATION_SECONDS,
      dom,
      allRequests,
      failedRequests,
      consoleLogs,
      pageErrors,
    });

    const { jsonPath, markdownPath } = writeTurnstileDiagnosticReport(report);
    printTurnstileDiagnosticSummary(report);

    console.log(`[turnstile-diagnostic] JSON report: ${jsonPath}`);
    console.log(`[turnstile-diagnostic] Markdown report: ${markdownPath}`);

    await test.info().attach('turnstile-diagnostic-report.json', {
      path: jsonPath,
      contentType: 'application/json',
    });
    await test.info().attach('turnstile-diagnostic-report.md', {
      path: markdownPath,
      contentType: 'text/markdown',
    });
  });
});
