import fs from 'fs';
import path from 'path';

export const TURNSTILE_DIAGNOSTIC_DIR = path.join('test-results', 'turnstile-diagnostic');

export interface NetworkRequestRecord {
  url: string;
  method: string;
  resourceType: string;
  timestamp: string;
}

export interface FailedRequestRecord {
  url: string;
  method: string;
  resourceType: string;
  errorText: string;
  timestamp: string;
}

export interface ConsoleLogRecord {
  type: string;
  text: string;
  timestamp: string;
}

export interface SiteKeyElementRecord {
  tagName: string;
  id: string;
  className: string;
  siteKey: string;
  visible: boolean;
  outerHTMLSnippet: string;
}

export interface DomSnapshot {
  iframeSrcs: string[];
  scriptSrcs: string[];
  dataSitekeyElements: SiteKeyElementRecord[];
  cfTurnstileResponsePresent: boolean;
  cfTurnstileResponseLength: number;
  widgetSelectorsFound: string[];
  navigatorWebdriver: boolean | null;
}

export interface TurnstileDiagnosticReport {
  generatedAt: string;
  pageUrl: string;
  observationWindowSeconds: number;
  dom: DomSnapshot;
  network: {
    totalRequests: number;
    failedRequestCount: number;
    allRequests: NetworkRequestRecord[];
    failedRequests: FailedRequestRecord[];
    turnstileRelatedRequests: NetworkRequestRecord[];
    turnstileScriptRequests: NetworkRequestRecord[];
    turnstileScriptLoaded: boolean;
    turnstileScriptLoadedSuccessfully: boolean;
  };
  consoleLogs: ConsoleLogRecord[];
  pageErrors: string[];
  checks: {
    dataSitekeyExists: boolean;
    turnstileJavaScriptFileLoads: boolean;
    turnstileWidgetVisible: boolean;
    automationDetected: boolean;
  };
  conclusions: string[];
  likelyRootCause: string;
  recommendations: string[];
}

const TURNSTILE_URL_PATTERNS = [
  /turnstile/i,
  /challenges\.cloudflare\.com/i,
  /cloudflare\.com\/turnstile/i,
];

const TURNSTILE_SCRIPT_PATTERNS = [
  /turnstile\/v0\/api\.js/i,
  /challenges\.cloudflare\.com\/turnstile/i,
  /cdn-cgi\/challenge-platform/i,
];

export function isTurnstileRelatedUrl(url: string): boolean {
  return TURNSTILE_URL_PATTERNS.some((pattern) => pattern.test(url));
}

export function isTurnstileScriptUrl(url: string): boolean {
  return TURNSTILE_SCRIPT_PATTERNS.some((pattern) => pattern.test(url));
}

export function buildTurnstileDiagnosticReport(input: {
  pageUrl: string;
  observationWindowSeconds: number;
  dom: DomSnapshot;
  allRequests: NetworkRequestRecord[];
  failedRequests: FailedRequestRecord[];
  consoleLogs: ConsoleLogRecord[];
  pageErrors: string[];
}): TurnstileDiagnosticReport {
  const turnstileRelatedRequests = input.allRequests.filter((request) =>
    isTurnstileRelatedUrl(request.url),
  );
  const turnstileScriptRequests = input.allRequests.filter((request) =>
    isTurnstileScriptUrl(request.url),
  );
  const failedTurnstileRequests = input.failedRequests.filter((request) =>
    isTurnstileRelatedUrl(request.url),
  );

  const turnstileScriptLoaded = turnstileScriptRequests.length > 0;
  const turnstileScriptLoadedSuccessfully =
    turnstileScriptLoaded && failedTurnstileRequests.length === 0;
  const dataSitekeyExists = input.dom.dataSitekeyElements.length > 0;
  const automationDetected = input.dom.navigatorWebdriver === true;

  const turnstileConsoleMessages = input.consoleLogs.filter(
    (log) => isTurnstileRelatedUrl(log.text) || /captcha|turnstile|cloudflare/i.test(log.text),
  );
  const turnstilePageErrors = input.pageErrors.filter((error) =>
    /turnstile|cloudflare|captcha/i.test(error),
  );

  const conclusions: string[] = [];
  const recommendations: string[] = [];

  if (automationDetected) {
    conclusions.push(
      'navigator.webdriver is true — the browser is identified as automated (Playwright/Chromium control).',
    );
    recommendations.push(
      'Use launchPersistentContext with a real Chrome profile, or manual auth bootstrap, instead of automating Turnstile directly.',
    );
  }

  if (!turnstileScriptLoaded) {
    conclusions.push(
      'No Turnstile JavaScript file was requested — the widget bootstrap script never started loading.',
    );
    recommendations.push(
      'Inspect the login component for conditional Turnstile rendering and verify the script tag is emitted on /account/login.',
    );
  } else if (!turnstileScriptLoadedSuccessfully) {
    conclusions.push(
      'Turnstile-related network requests failed — script or challenge platform assets did not load successfully.',
    );
    recommendations.push(
      'Check failed request URLs for CSP blocks, ad blockers, corporate proxy, or Cloudflare availability issues.',
    );
  } else {
    conclusions.push('Turnstile JavaScript assets were requested over the network.');
  }

  if (!dataSitekeyExists) {
    conclusions.push(
      'No element with data-sitekey exists in the DOM — Turnstile was not rendered/initialized in the page.',
    );
    recommendations.push(
      'Confirm the Angular login component calls turnstile.render() and that bot/automation checks do not skip widget creation.',
    );
  } else {
    conclusions.push(
      `Found ${input.dom.dataSitekeyElements.length} element(s) with data-sitekey in the DOM.`,
    );
  }

  if (input.dom.iframeSrcs.length === 0) {
    conclusions.push(
      'No Cloudflare/Turnstile iframes were created — widget iframe injection did not occur.',
    );
  }

  if (input.dom.cfTurnstileResponseLength === 0) {
    conclusions.push('cf-turnstile-response is empty — no Turnstile token was issued.');
  }

  if (turnstileConsoleMessages.length > 0) {
    conclusions.push(
      `Captured ${turnstileConsoleMessages.length} browser console message(s) related to Turnstile/Captcha.`,
    );
  }

  if (turnstilePageErrors.length > 0) {
    conclusions.push(
      `Captured ${turnstilePageErrors.length} page error(s) related to Turnstile/Captcha.`,
    );
  }

  if (input.failedRequests.length > 0) {
    conclusions.push(`Captured ${input.failedRequests.length} failed network request(s) overall.`);
  }

  let likelyRootCause = 'Turnstile initialization did not complete.';

  if (automationDetected && !dataSitekeyExists && input.dom.iframeSrcs.length === 0) {
    likelyRootCause =
      'Cloudflare Turnstile likely refused to initialize because Playwright automation was detected (navigator.webdriver=true), so no widget markup (data-sitekey) or iframe was injected.';
  } else if (!turnstileScriptLoaded) {
    likelyRootCause =
      'Turnstile was not initialized because the Turnstile JavaScript bundle was never requested — the login page may not be loading the widget script in this environment.';
  } else if (!turnstileScriptLoadedSuccessfully) {
    likelyRootCause =
      'Turnstile was not initialized because Turnstile/Cloudflare network assets failed to load.';
  } else if (!dataSitekeyExists) {
    likelyRootCause =
      'Turnstile JavaScript may have loaded, but the widget was not rendered into the DOM (missing data-sitekey element).';
  } else if (input.dom.cfTurnstileResponseLength === 0) {
    likelyRootCause =
      'Turnstile widget markup exists, but token generation did not complete (cf-turnstile-response is still empty).';
  }

  return {
    generatedAt: new Date().toISOString(),
    pageUrl: input.pageUrl,
    observationWindowSeconds: input.observationWindowSeconds,
    dom: input.dom,
    network: {
      totalRequests: input.allRequests.length,
      failedRequestCount: input.failedRequests.length,
      allRequests: input.allRequests,
      failedRequests: input.failedRequests,
      turnstileRelatedRequests,
      turnstileScriptRequests,
      turnstileScriptLoaded,
      turnstileScriptLoadedSuccessfully,
    },
    consoleLogs: input.consoleLogs,
    pageErrors: input.pageErrors,
    checks: {
      dataSitekeyExists,
      turnstileJavaScriptFileLoads: turnstileScriptLoadedSuccessfully,
      turnstileWidgetVisible: input.dom.widgetSelectorsFound.length > 0,
      automationDetected,
    },
    conclusions,
    likelyRootCause,
    recommendations,
  };
}

export function formatTurnstileDiagnosticReportMarkdown(report: TurnstileDiagnosticReport): string {
  const lines = [
    '# Turnstile Diagnostic Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Page URL: ${report.pageUrl}`,
    `Observation window: ${report.observationWindowSeconds}s`,
    '',
    '## Summary',
    '',
    `**Likely root cause:** ${report.likelyRootCause}`,
    '',
    '## Checks',
    '',
    `- navigator.webdriver (automation detected): ${report.checks.automationDetected}`,
    `- Turnstile JavaScript file loads: ${report.checks.turnstileJavaScriptFileLoads}`,
    `- data-sitekey element exists: ${report.checks.dataSitekeyExists}`,
    `- Turnstile widget visible: ${report.checks.turnstileWidgetVisible}`,
    `- cf-turnstile-response length: ${report.dom.cfTurnstileResponseLength}`,
    `- iframe count: ${report.dom.iframeSrcs.length}`,
    '',
    '## Conclusions',
    '',
    ...report.conclusions.map((item) => `- ${item}`),
    '',
    '## Recommendations',
    '',
    ...report.recommendations.map((item) => `- ${item}`),
    '',
    '## DOM',
    '',
    `### data-sitekey elements (${report.dom.dataSitekeyElements.length})`,
    '',
  ];

  if (report.dom.dataSitekeyElements.length === 0) {
    lines.push('_None found_');
  } else {
    report.dom.dataSitekeyElements.forEach((element, index) => {
      lines.push(
        `${index + 1}. \`${element.tagName}\` sitekey=\`${element.siteKey}\` visible=${element.visible}`,
      );
    });
  }

  lines.push('', '### iframe src values', '');
  if (report.dom.iframeSrcs.length === 0) {
    lines.push('_None found_');
  } else {
    report.dom.iframeSrcs.forEach((src) => lines.push(`- ${src}`));
  }

  lines.push('', '## Turnstile network requests', '');
  if (report.network.turnstileRelatedRequests.length === 0) {
    lines.push('_None captured_');
  } else {
    report.network.turnstileRelatedRequests.forEach((request) => {
      lines.push(`- [${request.method}] ${request.url}`);
    });
  }

  lines.push('', '## Failed network requests', '');
  if (report.network.failedRequests.length === 0) {
    lines.push('_None captured_');
  } else {
    report.network.failedRequests.forEach((request) => {
      lines.push(`- [${request.method}] ${request.url} — ${request.errorText}`);
    });
  }

  lines.push('', '## Browser console logs', '');
  if (report.consoleLogs.length === 0) {
    lines.push('_None captured_');
  } else {
    report.consoleLogs.forEach((log) => {
      lines.push(`- [${log.type}] ${log.text}`);
    });
  }

  lines.push('', '## Page errors', '');
  if (report.pageErrors.length === 0) {
    lines.push('_None captured_');
  } else {
    report.pageErrors.forEach((error) => lines.push(`- ${error}`));
  }

  return lines.join('\n');
}

export function writeTurnstileDiagnosticReport(report: TurnstileDiagnosticReport): {
  jsonPath: string;
  markdownPath: string;
} {
  fs.mkdirSync(TURNSTILE_DIAGNOSTIC_DIR, { recursive: true });

  const jsonPath = path.join(TURNSTILE_DIAGNOSTIC_DIR, 'report.json');
  const markdownPath = path.join(TURNSTILE_DIAGNOSTIC_DIR, 'report.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(markdownPath, formatTurnstileDiagnosticReportMarkdown(report), 'utf-8');

  return { jsonPath, markdownPath };
}

export function printTurnstileDiagnosticSummary(report: TurnstileDiagnosticReport): void {
  console.log('\n========== TURNSTILE DIAGNOSTIC REPORT ==========');
  console.log(`Likely root cause: ${report.likelyRootCause}`);
  console.log(`navigator.webdriver: ${report.dom.navigatorWebdriver}`);
  console.log(`Turnstile JS loaded: ${report.checks.turnstileJavaScriptFileLoads}`);
  console.log(`data-sitekey exists: ${report.checks.dataSitekeyExists}`);
  console.log(`iframe count: ${report.dom.iframeSrcs.length}`);
  console.log(`failed requests: ${report.network.failedRequestCount}`);
  console.log(`console logs: ${report.consoleLogs.length}`);
  console.log(`page errors: ${report.pageErrors.length}`);
  console.log('Conclusions:');
  report.conclusions.forEach((item) => console.log(`  - ${item}`));
  console.log('Recommendations:');
  report.recommendations.forEach((item) => console.log(`  - ${item}`));
  console.log('=================================================\n');
}
