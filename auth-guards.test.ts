import { describe, expect, it } from 'vitest';
import { AccessError, authorizeOwnerIdentity, verifiedIdentityFromUser } from '@/lib/auth/guards';

describe('verifiedIdentityFromUser', () => {
  it('rejects an unauthenticated user', () => {
    expect(() => verifiedIdentityFromUser(null)).toThrowError(AccessError);
    try {
      verifiedIdentityFromUser(null);
    } catch (error) {
      expect(error).toMatchObject({ status: 401 });
    }
  });

  it('rejects a user whose email is not verified', () => {
    expect(() =>
      verifiedIdentityFromUser({ id: 'u1', email: 'person@example.com', email_confirmed_at: null }),
    ).toThrowError(AccessError);
  });
});

describe('authorizeOwnerIdentity', () => {
  const verified = { id: 'owner-id', email: 'Owner@Example.com' };

  it('rejects an authenticated non-owner with 403', () => {
    expect(() => authorizeOwnerIdentity(verified, 'different@example.com')).toThrowError(AccessError);
    try {
      authorizeOwnerIdentity(verified, 'different@example.com');
    } catch (error) {
      expect(error).toMatchObject({ status: 403 });
    }
  });

  it('accepts only a normalized exact owner email', () => {
    expect(authorizeOwnerIdentity(verified, ' owner@example.com ')).toEqual({
      id: 'owner-id',
      email: 'Owner@Example.com',
    });
  });

  it('does not accept a client supplied role flag', () => {
    const clientClaim = { ...verified, role: 'owner' } as typeof verified & { role: string };
    expect(() => authorizeOwnerIdentity(clientClaim, 'different@example.com')).toThrowError(
      AccessError,
    );
  });
});
