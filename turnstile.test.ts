import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from '@/lib/security/turnstile';

function configureTurnstile() {
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
  vi.stubEnv('TURNSTILE_ALLOWED_HOSTNAMES', 'requests.example.com,www.requests.example.com');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('verifyTurnstile', () => {
  it('fails closed for a missing token', async () => {
    configureTurnstile();
    expect(await verifyTurnstile('')).toEqual({ success: false, errorCodes: ['missing-input-response'] });
  });

  it('fails closed when the allowed hostname list is not configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
      vi.stubEnv('TURNSTILE_ALLOWED_HOSTNAMES', '');
    expect(await verifyTurnstile('token')).toEqual({ success: false, errorCodes: ['server-misconfigured-hostnames'] });
  });

  it('fails when Siteverify reports failure', async () => {
    configureTurnstile();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 })));
    expect(await verifyTurnstile('bad-token')).toEqual({ success: false, errorCodes: ['invalid-input-response'] });
  });

  it('passes only when Siteverify reports the expected hostname and action', async () => {
    configureTurnstile();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      hostname: 'requests.example.com',
      action: 'request-submit',
    }), { status: 200 })));
    expect(await verifyTurnstile('good-token', '203.0.113.5')).toEqual({ success: true, errorCodes: [] });
  });

  it('rejects a valid token minted for an unexpected hostname', async () => {
    configureTurnstile();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      hostname: 'evil.example.net',
      action: 'request-submit',
    }), { status: 200 })));
    expect(await verifyTurnstile('good-token')).toEqual({ success: false, errorCodes: ['hostname-mismatch'] });
  });

  it('rejects a valid token minted for another action', async () => {
    configureTurnstile();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      hostname: 'requests.example.com',
      action: 'login',
    }), { status: 200 })));
    expect(await verifyTurnstile('good-token')).toEqual({ success: false, errorCodes: ['action-mismatch'] });
  });

  it('treats duplicate or expired tokens as failure', async () => {
    configureTurnstile();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, 'error-codes': ['timeout-or-duplicate'] }), { status: 200 })));
    expect(await verifyTurnstile('reused-token')).toEqual({ success: false, errorCodes: ['timeout-or-duplicate'] });
  });
});
