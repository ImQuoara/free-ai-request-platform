import type { VerifiedIdentity } from '@/lib/auth/guards';
export function classifyMessageActor(
  identity: VerifiedIdentity,
  configuredOwnerEmail: string | undefined,
): 'owner' | 'requester' {
  if (
    configuredOwnerEmail?.trim() &&
    identity.email.trim().toLowerCase() === configuredOwnerEmail.trim().toLowerCase()
  ) {
    return 'owner';
  }
  return 'requester';
}
