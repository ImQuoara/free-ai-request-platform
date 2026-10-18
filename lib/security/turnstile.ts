import 'server-only';
import { REQUEST_TURNSTILE_ACTION } from './turnstile-config';

export type TurnstileResult = {
  success: boolean;
  errorCodes: string[];
};

type SiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
};

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function configuredHostnames(): string[] {
  return (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<TurnstileResult> {
  if (!token.trim()) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: false, errorCodes: ['server-misconfigured'] };
  }

  const allowedHostnames = configuredHostnames();
  if (allowedHostnames.length === 0) {
    return { success: false, errorCodes: ['server-misconfigured-hostnames'] };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return { success: false, errorCodes: ['siteverify-http-error'] };
    }

    const payload = (await response.json()) as SiteverifyResponse;
    const errorCodes = Array.isArray(payload['error-codes']) ? payload['error-codes'] : [];

    if (payload.success !== true) {
      return { success: false, errorCodes: errorCodes.length ? errorCodes : ['siteverify-rejected'] };
    }

    const hostname = payload.hostname?.trim().toLowerCase();
    if (!hostname || !allowedHostnames.includes(hostname)) {
      return { success: false, errorCodes: ['hostname-mismatch'] };
    }

    if (payload.action !== REQUEST_TURNSTILE_ACTION) {
      return { success: false, errorCodes: ['action-mismatch'] };
    }

    return { success: true, errorCodes: [] };
  } catch {
    return { success: false, errorCodes: ['siteverify-unavailable'] };
  }
}
