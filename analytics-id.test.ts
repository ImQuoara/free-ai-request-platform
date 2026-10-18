import { describe, expect, it } from 'vitest';
import { createRotatingVisitHash, rotationBucket } from '@/lib/security/analytics-id';
import { normalizeAttribution, safeAnalyticsPath } from '@/lib/domain/analytics';

describe('rotating analytics identifiers', () => {
  const secret = '0123456789abcdef0123456789abcdef';

  it('is stable inside a UTC day and rotates on the next day', () => {
    const a = createRotatingVisitHash(secret, '203.0.113.9', 'browser-session', new Date('2026-10-17T01:00:00Z'));
    const b = createRotatingVisitHash(secret, '203.0.113.9', 'browser-session', new Date('2026-10-17T23:59:00Z'));
    const c = createRotatingVisitHash(secret, '203.0.113.9', 'browser-session', new Date('2026-10-18T00:01:00Z'));
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(a).not.toContain('203.0.113.9');
    expect(a).not.toContain('browser-session');
  });

  it('uses an explicit UTC date bucket', () => {
    expect(rotationBucket(new Date('2026-10-17T23:30:00-07:00'))).toBe('2026-10-18');
  });
});

describe('analytics privacy normalization', () => {
  it('normalizes source and campaign into bounded attribution tokens', () => {
    expect(normalizeAttribution(' TikTok / Bio Link!! ', 80)).toBe('tiktok-bio-link');
  });

  it('allows only public analytics paths and rejects private paths', () => {
    expect(safeAnalyticsPath('/')).toBe(true);
    expect(safeAnalyticsPath('/request')).toBe(true);
    expect(safeAnalyticsPath('/work/RABCDEF12')).toBe(true);
    expect(safeAnalyticsPath('/portal/11111111-1111-4111-8111-111111111111')).toBe(false);
    expect(safeAnalyticsPath('/admin')).toBe(false);
    expect(safeAnalyticsPath('/request?email=private@example.com')).toBe(false);
  });
});
