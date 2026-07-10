import type { Page } from '@playwright/test';
import { TurnstileCaptchaHelper } from './captcha';

/**
 * No-op when Turnstile is absent or disabled on staging.
 * Delegates to TurnstileCaptchaHelper when captcha is present.
 */
export async function solveTurnstileIfPresent(page: Page): Promise<boolean> {
  const captcha = new TurnstileCaptchaHelper(page);
  if (!(await captcha.isCaptchaPresent())) {
    return true;
  }
  return captcha.solveCaptcha();
}
