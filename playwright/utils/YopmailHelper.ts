import { expect, type Page } from '@playwright/test';

export interface YopmailPollOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  subjectPattern?: RegExp;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;

const PASSWORD_PATTERNS: RegExp[] = [
  /temporary\s+password[:\s]+["']?([^\s"'<]+)["']?/i,
  /temp(?:orary)?\s+password[:\s]+["']?([^\s"'<]+)["']?/i,
  /your\s+password[:\s]+["']?([^\s"'<]+)["']?/i,
  /password[:\s]+["']?([A-Za-z0-9@#$%^&*!._-]{6,})["']?/i,
  /OTP[:\s]+["']?([^\s"'<]+)["']?/i,
  /credentials?[:\s]+[\s\S]*?password[:\s]+["']?([^\s"'<]+)["']?/i,
];

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
    const subjectPattern = options.subjectPattern ?? /capital|password|credential|welcome|tenant/i;
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

  private async pollInboxOnce(inboxId: string, subjectPattern: RegExp): Promise<string | null> {
    await this.page.goto(`https://yopmail.com/en/wm/${inboxId}/`, {
      waitUntil: 'domcontentloaded',
    });

    const refreshButton = this.page
      .locator('#refresh, button[title*="Refresh"], .wminboxheader button')
      .first();
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click();
      await this.page.waitForTimeout(1_500);
    }

    const messageRows = this.page.locator('.m, .lm, #listelms .m');
    const messageCount = await messageRows.count();

    for (let index = 0; index < messageCount; index += 1) {
      const row = messageRows.nth(index);
      const rowText = (await row.textContent())?.trim() ?? '';
      if (!subjectPattern.test(rowText)) {
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
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
