import { expect, type Locator, type Page } from '@playwright/test';
import { isHeadedMode } from './env';
import { LoginBlockedByCaptchaError } from './errors';

export interface CaptchaStatus {
  present: boolean;
  tokenPresent: boolean;
  errorVisible: boolean;
  errorMessage?: string;
}

const CAPTCHA_LOAD_WAIT_MS = 15_000;
const CAPTCHA_TOKEN_WAIT_MS = 15_000;
const CAPTCHA_HEADED_TOKEN_WAIT_MS = 90_000;
const CAPTCHA_CLICK_RETRIES = 3;

export class TurnstileCaptchaHelper {
  private readonly page: Page;
  readonly captchaTokenInput: Locator;
  readonly captchaErrorAlert: Locator;
  readonly captchaWidget: Locator;

  constructor(page: Page) {
    this.page = page;
    this.captchaTokenInput = page.locator('input[name="cf-turnstile-response"]');
    this.captchaErrorAlert = page.getByRole('alert').filter({ hasText: /captcha/i });
    this.captchaWidget = page.locator(
      '.cf-turnstile, [class*="turnstile"], iframe[src*="turnstile"], iframe[src*="challenges.cloudflare"]',
    );
  }

  async getStatus(): Promise<CaptchaStatus> {
    const present = await this.isCaptchaPresent();
    const tokenPresent = present ? await this.isCaptchaTokenPresent() : false;
    const errorVisible = await this.isCaptchaErrorVisible();
    const errorMessage = errorVisible
      ? (await this.captchaErrorAlert.first().textContent())?.trim()
      : undefined;

    return { present, tokenPresent, errorVisible, errorMessage };
  }

  async isCaptchaPresent(): Promise<boolean> {
    const hasTokenField = (await this.captchaTokenInput.count()) > 0;
    const hasWidget = (await this.captchaWidget.count()) > 0;
    const hasCloudflareFrame = this.getCloudflareTurnstileFrame() !== undefined;
    return hasTokenField || hasWidget || hasCloudflareFrame;
  }

  async isCaptchaTokenPresent(): Promise<boolean> {
    if ((await this.captchaTokenInput.count()) === 0) {
      return false;
    }

    const token = await this.captchaTokenInput.first().inputValue();
    return token.trim().length > 0;
  }

  async isCaptchaErrorVisible(): Promise<boolean> {
    return this.captchaErrorAlert.first().isVisible();
  }

  async waitForCaptchaToLoad(timeoutMs = CAPTCHA_LOAD_WAIT_MS): Promise<void> {
    if (!(await this.isCaptchaPresent())) {
      return;
    }

    await expect(this.captchaTokenInput.first()).toBeAttached({ timeout: 5_000 });

    try {
      await expect
        .poll(
          () => Promise.resolve(this.getCloudflareTurnstileFrame() !== undefined),
          {
            timeout: timeoutMs,
            message: 'Waiting for Cloudflare Turnstile frame to load',
          },
        )
        .toBe(true);
    } catch {
      // Continue to click attempt even if frame polling times out.
    }

    await this.page.waitForTimeout(1_500);
  }

  async clickToVerifyCaptcha(): Promise<void> {
    const cloudflareFrame = this.getCloudflareTurnstileFrame();

    if (cloudflareFrame) {
      const frameElement = await cloudflareFrame.frameElement();
      await frameElement.scrollIntoViewIfNeeded();

      const boundingBox = await frameElement.boundingBox();
      if (boundingBox) {
        await this.page.mouse.click(
          boundingBox.x + 30,
          boundingBox.y + boundingBox.height / 2,
        );
        return;
      }

      await cloudflareFrame.locator('body').click({ timeout: 5_000 }).catch(() => undefined);
      return;
    }

    if ((await this.captchaWidget.count()) > 0) {
      await this.captchaWidget.first().click();
      return;
    }

    const tokenFieldBox = await this.captchaTokenInput.first().boundingBox();
    if (tokenFieldBox) {
      await this.page.mouse.click(tokenFieldBox.x - 40, tokenFieldBox.y);
    }
  }

  async solveCaptcha(): Promise<boolean> {
    if (!(await this.isCaptchaPresent())) {
      return true;
    }

    await this.waitForCaptchaToLoad();

    for (let attempt = 0; attempt < CAPTCHA_CLICK_RETRIES; attempt += 1) {
      await this.clickToVerifyCaptcha();

      const tokenObtained = await this.waitForCaptchaToken(this.getTokenWaitTimeout());
      if (tokenObtained) {
        return true;
      }

      await this.page.waitForTimeout(2_000);
    }

    return false;
  }

  async waitForCaptchaToken(timeoutMs = CAPTCHA_TOKEN_WAIT_MS): Promise<boolean> {
    if (!(await this.isCaptchaPresent())) {
      return true;
    }

    try {
      await expect
        .poll(async () => this.isCaptchaTokenPresent(), {
          timeout: timeoutMs,
          message: isHeadedMode()
            ? 'Waiting for Turnstile token. Complete captcha manually in the browser if needed.'
            : 'Waiting for Cloudflare Turnstile token after verification click',
        })
        .toBe(true);
      return true;
    } catch {
      return false;
    }
  }

  async assertCaptchaValidated(): Promise<void> {
    const status = await this.getStatus();

    if (!status.present) {
      return;
    }

    if (!status.tokenPresent) {
      throw new LoginBlockedByCaptchaError(status);
    }
  }

  async assertNotBlockingLogin(): Promise<void> {
    const status = await this.getStatus();

    if (status.errorVisible || (status.present && !status.tokenPresent)) {
      throw new LoginBlockedByCaptchaError(status);
    }
  }

  formatStatusReport(status: CaptchaStatus): string {
    return [
      'Captcha status:',
      `  present: ${status.present}`,
      `  tokenPresent: ${status.tokenPresent}`,
      `  errorVisible: ${status.errorVisible}`,
      `  errorMessage: ${status.errorMessage ?? 'n/a'}`,
    ].join('\n');
  }

  private getTokenWaitTimeout(): number {
    return isHeadedMode() ? CAPTCHA_HEADED_TOKEN_WAIT_MS : CAPTCHA_TOKEN_WAIT_MS;
  }

  private getCloudflareTurnstileFrame() {
    return this.page.frames().find((frame) => frame.url().includes('challenges.cloudflare.com'));
  }
}
