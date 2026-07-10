import type { CaptchaStatus } from './captcha';

export class LoginBlockedByCaptchaError extends Error {
  readonly captchaStatus: CaptchaStatus;

  constructor(captchaStatus: CaptchaStatus) {
    super('Login blocked by captcha.');
    this.name = 'LoginBlockedByCaptchaError';
    this.captchaStatus = captchaStatus;
  }
}

export class AuthenticationFailedError extends Error {
  constructor(message = 'Authentication failed: still on login page.') {
    super(message);
    this.name = 'AuthenticationFailedError';
  }
}
