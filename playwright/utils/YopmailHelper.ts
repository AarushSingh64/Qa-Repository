import { expect, type Page } from '@playwright/test';

export interface YopmailPollOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  subjectPattern?: RegExp;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;

const PASSWORD_PATTERNS: RegExp[] = [
  /temporary\s+password\s*[:\-–]?\s*["']?([A-Za-z0-9@#$%^&*!._-]{6,})["']?/i,
  /temp(?:orary)?\s+password\s*[:\-–]?\s*["']?([A-Za-z0-9@#$%^&*!._-]{6,})["']?/i,
  /your\s+(?:temporary\s+)?password\s*(?:is|:)?\s*["']?([A-Za-z0-9@#$%^&*!._-]{6,})["']?/i,
  /password\s*(?:is|:)?\s*["']?([A-Za-z0-9@#$%^&*!._-]{8,})["']?/i,
];

const INVALID_PASSWORD_TOKENS = new Set([
  'verification',
  'password',
  'temporary',
  'welcome',
  'please',
  'click',
  'here',
  'login',
  'account',
  'tenant',
  'capital',
]);

export class YopmailHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  static extractInboxId(email: string): string {
    const [inbox] = email.trim().toLowerCase().split('@');
    if (!inbox) {
      throw new Error(`Invalid Yopmail address: ${email}`);
    }
    return inbox;
  }

  async waitForTemporaryPassword(
    email: string,
    options: YopmailPollOptions = {},
  ): Promise<string> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const subjectPattern = options.subjectPattern ?? /capital|password|credential|welcome|tenant|login/i;
    const inboxId = YopmailHelper.extractInboxId(email);
    const deadline = Date.now() + timeoutMs;
    let lastError = 'No matching email found in Yopmail inbox.';

    while (Date.now() < deadline) {
      try {
        const password = await this.pollInboxOnce(inboxId, subjectPattern);
        if (password) {
          return password;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      await this.page.waitForTimeout(pollIntervalMs);
    }

    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for temporary password at ${email}. ${lastError}`,
    );
  }

  private async openInbox(inboxId: string): Promise<void> {
    await this.page.goto('https://yopmail.com/en/', { waitUntil: 'domcontentloaded' });
    await this.dismissConsentIfPresent();

    const loginInput = this.page.locator('#login');
    await expect(loginInput).toBeVisible({ timeout: 15_000 });
    await loginInput.fill(inboxId);

    const checkInbox = this.page.locator('#refreshbut, button.sbut, .sbut');
    if (await checkInbox.first().isVisible().catch(() => false)) {
      await checkInbox.first().click();
    } else {
      await loginInput.press('Enter');
    }

    await this.page.waitForTimeout(2_000);
    await expect(this.page.locator('#ifinbox, #ifmail').first()).toBeAttached({
      timeout: 15_000,
    });
  }

  private async dismissConsentIfPresent(): Promise<void> {
    const consent = this.page.getByRole('button', {
      name: /accept|agree|consent|ok|got it/i,
    });
    if (await consent.first().isVisible().catch(() => false)) {
      await consent.first().click().catch(() => undefined);
    }
  }

  private async pollInboxOnce(inboxId: string, subjectPattern: RegExp): Promise<string | null> {
    await this.openInbox(inboxId);

    const refreshButton = this.page.locator('#refresh, #refreshbut, button[title*="Refresh"]').first();
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click();
      await this.page.waitForTimeout(1_500);
    }

    const inboxFrame = this.page.frameLocator('#ifinbox');
    const messageRows = inboxFrame.locator('.m, .lm');
    const messageCount = await messageRows.count();

    if (messageCount === 0) {
      // Fallback: some Yopmail layouts render messages outside the iframe.
      const pageRows = this.page.locator('.m, .lm, #listelms .m');
      const pageCount = await pageRows.count();
      for (let index = 0; index < pageCount; index += 1) {
        const row = pageRows.nth(index);
        const rowText = (await row.textContent())?.trim() ?? '';
        if (!subjectPattern.test(rowText) && index > 0) {
          continue;
        }
        await row.click();
        await this.page.waitForTimeout(1_000);
        const bodyText = await this.readMessageBody();
        const password = this.extractPasswordFromBody(bodyText);
        if (password) {
          return password;
        }
      }
      return null;
    }

    for (let index = 0; index < messageCount; index += 1) {
      const row = messageRows.nth(index);
      const rowText = (await row.textContent())?.trim() ?? '';
      if (!subjectPattern.test(rowText) && index > 0) {
        continue;
      }

      await row.click();
      await this.page.waitForTimeout(1_000);

      const bodyText = await this.readMessageBody();
      const password = this.extractPasswordFromBody(bodyText);
      if (password) {
        return password;
      }
    }

    // Last resort: open newest message even if subject did not match.
    if (messageCount > 0) {
      await messageRows.first().click();
      await this.page.waitForTimeout(1_000);
      return this.extractPasswordFromBody(await this.readMessageBody());
    }

    return null;
  }

  private async readMessageBody(): Promise<string> {
    const mailFrame = this.page.frameLocator('#ifmail');
    const body = mailFrame.locator('body');

    await expect(body).toBeVisible({ timeout: 10_000 });
    return (await body.innerText()) ?? '';
  }

  private extractPasswordFromBody(body: string): string | null {
    const normalized = body.replace(/\s+/g, ' ').trim();

    for (const pattern of PASSWORD_PATTERNS) {
      const match = normalized.match(pattern);
      const candidate = match?.[1]?.trim();
      if (!candidate) {
        continue;
      }

      if (INVALID_PASSWORD_TOKENS.has(candidate.toLowerCase())) {
        continue;
      }

      // Prefer credentials that look like generated passwords (mixed charset / symbols).
      if (!/[0-9]/.test(candidate) && !/[@#$%^&*!._-]/.test(candidate)) {
        continue;
      }

      return candidate;
    }

    return null;
  }
}
