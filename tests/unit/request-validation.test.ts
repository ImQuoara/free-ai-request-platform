import { describe, expect, it } from 'vitest';
import { requestSubmissionSchema } from '@/lib/validation/request';
import { sanitizeReferenceUrl } from '@/lib/security/urls';

const valid = {
  name: 'Taylor',
  discord: '',
  type: 'Song',
  description: 'Write a restrained country song about choosing honesty over appearances.',
  referenceLinks: ['https://example.com/reference'],
  consents: { review: true, rights: true, scope: true, showcase: true, credit: true },
  turnstileToken: 'token',
  honeypot: '',
  sessionId: 'session-1234567890',
  source: { utmSource: 'tiktok', utmCampaign: 'daily-free-work', referrer: 'https://tiktok.com/' },
};

describe('requestSubmissionSchema', () => {
  it('accepts the three supported request types', () => {
    for (const type of ['Song', 'Landing Page', 'Other']) {
      expect(requestSubmissionSchema.parse({ ...valid, type }).type).toBe(type);
    }
  });

  it('rejects undersized and oversized descriptions', () => {
    expect(requestSubmissionSchema.safeParse({ ...valid, description: 'short' }).success).toBe(false);
    expect(requestSubmissionSchema.safeParse({ ...valid, description: 'x'.repeat(5001) }).success).toBe(false);
  });

  it('requires every consent flag to be true', () => {
    expect(requestSubmissionSchema.safeParse({ ...valid, consents: { ...valid.consents, showcase: false } }).success).toBe(false);
  });

  it('limits reference links and rejects control characters', () => {
    expect(requestSubmissionSchema.safeParse({ ...valid, referenceLinks: Array(7).fill('https://example.com') }).success).toBe(false);
    expect(requestSubmissionSchema.safeParse({ ...valid, name: 'Bad\u0000Name' }).success).toBe(false);
  });
});

describe('sanitizeReferenceUrl', () => {
  it('allows normalized HTTPS references', () => {
    expect(sanitizeReferenceUrl(' https://Example.com/a#b ')).toBe('https://example.com/a#b');
  });

  it.each(['javascript:alert(1)', 'data:text/plain,hello', 'file:///tmp/x', 'http://example.com'])('rejects unsafe scheme %s', (url) => {
    expect(() => sanitizeReferenceUrl(url)).toThrow();
  });
});
