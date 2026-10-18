import { describe, expect, it } from 'vitest';
import { mapGuardRpcError } from '@/lib/request/guard-error';

describe('request route guard mapping', () => {
  it('maps cooldown metadata to HTTP 429 response data', () => {
    expect(mapGuardRpcError({ message: 'cooldown_active', details: '{"remaining_seconds":444}' })).toEqual({
      status: 429,
      body: { code: 'COOLDOWN', retryAfterSeconds: 444 },
    });
  });

  it('maps the daily cap to HTTP 429 with next eligibility', () => {
    const result = mapGuardRpcError({ message: 'daily_cap_reached', details: null }, new Date('2026-10-17T20:00:00Z'));
    expect(result.status).toBe(429);
    expect(result.body.code).toBe('DAILY_CAP');
    expect(result.body.nextEligibleAt).toBe('2026-10-18T00:00:00.000Z');
  });

  it('does not map submission to an acceptance/spot-decrement operation', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('app/api/request/route.ts', 'utf8'));
    expect(source).toContain("rpc('submit_request_guarded'");
    expect(source).not.toContain("rpc('transition_request_status_atomic'");
  });
});

it('records failed human verification only through hashed submission-attempt fields', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile('app/api/request/route.ts', 'utf8'));
  expect(source).toContain("outcome: 'verification_failed'");
  expect(source).not.toContain('raw_ip');
});
