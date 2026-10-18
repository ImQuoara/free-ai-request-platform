import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export type VerifiedIdentity = {
  id: string;
  email: string;
};

type UserLike = {
  id?: string | null;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

export class AccessError extends Error {
  readonly status: 401 | 403 | 500;

  constructor(status: 401 | 403 | 500, message: string) {
    super(message);
    this.name = 'AccessError';
    this.status = status;
  }
}

export function verifiedIdentityFromUser(user: UserLike | null): VerifiedIdentity {
  if (!user?.id || !user.email) {
    throw new AccessError(401, 'Authentication required.');
  }

  if (!user.email_confirmed_at && !user.confirmed_at) {
    throw new AccessError(401, 'Verified email required.');
  }

  return { id: user.id, email: user.email };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function authorizeOwnerIdentity(
  identity: VerifiedIdentity,
  configuredOwnerEmail: string | undefined,
): VerifiedIdentity {
  if (!configuredOwnerEmail?.trim()) {
    throw new AccessError(500, 'Owner access is not configured.');
  }

  if (normalizeEmail(identity.email) !== normalizeEmail(configuredOwnerEmail)) {
    throw new AccessError(403, 'Owner access required.');
  }

  return identity;
}

export async function requireUser(): Promise<VerifiedIdentity> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new AccessError(401, 'Authentication required.');
  }

  return verifiedIdentityFromUser(data.user);
}

export async function requireOwner(): Promise<VerifiedIdentity> {
  const identity = await requireUser();
  return authorizeOwnerIdentity(identity, process.env.OWNER_EMAIL);
}
