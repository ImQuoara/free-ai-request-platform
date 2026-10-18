import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from '@/lib/domain/settings';
import { canTransitionRequest } from '@/lib/domain/requests';

describe('site settings', () => {
  it('uses closed safe defaults', () => {
    expect(DEFAULT_SITE_SETTINGS).toEqual({
      requestsOpen: false,
      spotsAvailable: 0,
      reopensAt: null,
      cooldownMinutes: 10,
      perPersonDailyCap: 3,
      autoDecrementOnAccept: true,
      publicActivityEnabled: true,
    });
  });

  it('treats a null daily cap as unlimited', () => {
    expect(normalizeSiteSettings({ id: 'global', per_person_daily_cap: null }).perPersonDailyCap).toBeNull();
  });
});

describe('request status transitions', () => {
  it('allows the owner workflow transitions', () => {
    expect(canTransitionRequest('NEW', 'ACCEPTED')).toBe(true);
    expect(canTransitionRequest('ACCEPTED', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionRequest('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransitionRequest('COMPLETED', 'PUBLISHED')).toBe(true);
  });

  it('rejects invalid jumps', () => {
    expect(canTransitionRequest('NEW', 'PUBLISHED')).toBe(false);
    expect(canTransitionRequest('REJECTED', 'PUBLISHED')).toBe(false);
  });
});
