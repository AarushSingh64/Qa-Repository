import type { ConsoleMessage, Page, Request, Response } from '@playwright/test';
import type { TestInfo } from '@playwright/test';

export interface NetworkLogEntry {
  type: 'request' | 'response' | 'failed';
  url: string;
  method?: string;
  status?: number;
  errorText?: string;
  timestamp: string;
}

export interface ConsoleLogEntry {
  type: string;
  text: string;
  timestamp: string;
}

export class TestArtifactCollector {
  private readonly page: Page;
  private readonly networkLogs: NetworkLogEntry[] = [];
  private readonly consoleLogs: ConsoleLogEntry[] = [];
  private readonly pageErrors: string[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  attachListeners(): void {
    this.page.on('console', (message: ConsoleMessage) => {
      this.consoleLogs.push({
        type: message.type(),
        text: message.text(),
        timestamp: new Date().toISOString(),
      });
    });

    this.page.on('pageerror', (error) => {
      this.pageErrors.push(error.message);
    });

    this.page.on('request', (request: Request) => {
      this.networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString(),
      });
    });

    this.page.on('response', (response: Response) => {
      this.networkLogs.push({
        type: 'response',
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        timestamp: new Date().toISOString(),
      });
    });

    this.page.on('requestfailed', (request: Request) => {
      this.networkLogs.push({
        type: 'failed',
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
    });
  }

  async attachToTest(testInfo: TestInfo): Promise<void> {
    await testInfo.attach('console-logs.json', {
      contentType: 'application/json',
      body: JSON.stringify(this.consoleLogs, null, 2),
    });

    await testInfo.attach('network-logs.json', {
      contentType: 'application/json',
      body: JSON.stringify(this.networkLogs, null, 2),
    });

    if (this.pageErrors.length > 0) {
      await testInfo.attach('page-errors.json', {
        contentType: 'application/json',
        body: JSON.stringify(this.pageErrors, null, 2),
      });
    }
  }
}

export interface BugReportInput {
  testId: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  module: string;
  steps: string[];
  expected: string;
  actual: string;
  rootCausePossibility?: string;
  regressionAreas?: string[];
}

export function formatBugReport(report: BugReportInput): string {
  const lines = [
    `# Bug Report: ${report.testId} — ${report.title}`,
    '',
    `- Severity: ${report.severity}`,
    `- Priority: ${report.priority}`,
    `- Module: ${report.module}`,
    '',
    '## Steps to Reproduce',
    ...report.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Expected',
    report.expected,
    '',
    '## Actual',
    report.actual,
  ];

  if (report.rootCausePossibility) {
    lines.push('', '## Root Cause Possibility', report.rootCausePossibility);
  }

  if (report.regressionAreas?.length) {
    lines.push('', '## Regression Areas', ...report.regressionAreas.map((area) => `- ${area}`));
  }

  return lines.join('\n');
}

export async function attachBugReport(testInfo: TestInfo, report: BugReportInput): Promise<void> {
  await testInfo.attach('bug-report.md', {
    contentType: 'text/markdown',
    body: formatBugReport(report),
  });
}
