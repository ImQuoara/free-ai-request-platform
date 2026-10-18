import { describe, expect, it } from 'vitest';
import { adminSettingsPatchSchema, adminStatusSchema, notificationPatchSchema } from '@/lib/validation/admin';
import { canTransitionRequest, mapStatusTransitionRpcError } from '@/lib/domain/requests';

describe('owner settings validation', () => {
  const valid = {
    requestsOpen: true,
    spotsAvailable: 12,
    reopensAt: null,
    cooldownMinutes: 10,
    perPersonDailyCap: 3,
    autoDecrementOnAccept: true,
    publicActivityEnabled: true,
  };

  it('accepts the exact owner-controlled settings surface', () => {
    expect(adminSettingsPatchSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid limits and unknown settings', () => {
    expect(adminSettingsPatchSchema.safeParse({ ...valid, spotsAvailable: -1 }).success).toBe(false);
    expect(adminSettingsPatchSchema.safeParse({ ...valid, cooldownMinutes: 0 }).success).toBe(false);
    expect(adminSettingsPatchSchema.safeParse({ ...valid, perPersonDailyCap: 0 }).success).toBe(false);
    expect(adminSettingsPatchSchema.safeParse({ ...valid, perPersonDailyCap: 101 }).success).toBe(false);
    expect(adminSettingsPatchSchema.safeParse({ ...valid, secretToggle: true }).success).toBe(false);
  });

  it('allows an unlimited daily cap and a cleared reopen time', () => {
    expect(adminSettingsPatchSchema.parse({ ...valid, perPersonDailyCap: null, reopensAt: null }).perPersonDailyCap).toBeNull();
  });
});

describe('owner status commands', () => {
  it('accepts only known statuses', () => {
    expect(adminStatusSchema.safeParse({ targetStatus: 'ACCEPTED' }).success).toBe(true);
    expect(adminStatusSchema.safeParse({ targetStatus: 'DELETE' }).success).toBe(false);
  });

  it('keeps transition rules deterministic', () => {
    expect(canTransitionRequest('NEW', 'ACCEPTED')).toBe(true);
    expect(canTransitionRequest('NEW', 'COMPLETED')).toBe(false);
    expect(canTransitionRequest('COMPLETED', 'PUBLISHED')).toBe(true);
  });


  it('maps database transition failures to stable owner-facing API errors', () => {
    expect(mapStatusTransitionRpcError('invalid_status_transition')).toEqual({ code: 'ILLEGAL_TRANSITION', status: 409 });
    expect(mapStatusTransitionRpcError('no_spots_available')).toEqual({ code: 'NO_SPOTS_AVAILABLE', status: 409 });
    expect(mapStatusTransitionRpcError('request_not_found')).toEqual({ code: 'PROJECT_NOT_FOUND', status: 404 });
  });
});

describe('notification updates', () => {
  it('only accepts an explicit read state', () => {
    expect(notificationPatchSchema.safeParse({ read: true }).success).toBe(true);
    expect(notificationPatchSchema.safeParse({ read: false }).success).toBe(true);
    expect(notificationPatchSchema.safeParse({ read: true, delete: true }).success).toBe(false);
  });
});
