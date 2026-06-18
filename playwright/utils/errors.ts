import type { CaptchaStatus } from './captcha';

export class LoginBlockedByCaptchaError extends Error {
  readonly captchaStatus: CaptchaStatus;

  constructor(captchaStatus: CaptchaStatus) {
    super(
      [
        'Login blocked by captcha.',
        'Captcha cannot be disabled on staging.',
        'Run headed auth setup once: npm run test:auth',
        'Then run authenticated specs with the saved session.',
      ].join(' '),
    );
    this.name = 'LoginBlockedByCaptchaError';
    this.captchaStatus = captchaStatus;
  }
}
