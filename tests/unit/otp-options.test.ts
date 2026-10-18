import { describe, expect, it } from 'vitest';
import { buildPasswordlessOtpOptions } from '@/lib/auth/otp';

describe('buildPasswordlessOtpOptions', () => {
  it('requires a completed CAPTCHA token before requesting email delivery', () => {
    expect(() => buildPasswordlessOtpOptions('https://example.com', '')).toThrow('Human verification required');
  });

  it('binds the CAPTCHA token and exact internal callback to the OTP request', () => {
    expect(buildPasswordlessOtpOptions('https://example.com', 'captcha-token')).toEqual({
      emailRedirectTo: 'https://example.com/auth/callback?next=/request',
      shouldCreateUser: true,
      captchaToken: 'captcha-token',
    });
  });
});
