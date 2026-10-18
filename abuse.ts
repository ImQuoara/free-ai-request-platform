import 'server-only';

import { createHmac } from 'node:crypto';

export type AbuseContextInput = {
  email: string;
  ip?: string | null;
  sessionId?: string | null;
  description: string;
  referenceLinks: string[];
  recentNetworkAttemptCount?: number;
  distinctEmailsOnNetwork?: number;
  recentContentAttemptCount?: number;
  recentReferenceAttemptCount?: number;
  now?: Date;
};

export type AbuseContext = {
  emailHash: string;
  networkHash: string | null;
  sessionHash: string | null;
  contentHash: string;
  referenceHash: string | null;
  rotationBucket: string;
  riskFlags: string[];
};

function normalizedText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dailyBucket(now: Date) {
  return now.toISOString().slice(0, 10);
}

function hmac(secret: string, kind: string, bucket: string, value: string) {
  return createHmac('sha256', secret).update(`${kind}:${bucket}:${value}`).digest('hex');
}

export function buildAbuseContext(input: AbuseContextInput): AbuseContext {
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('ANALYTICS_HASH_SECRET must be configured server-side.');
  }

  const now = input.now ?? new Date();
  const rotationBucket = dailyBucket(now);
  const normalizedEmail = normalizedText(input.email);
  const normalizedIp = input.ip?.trim() || null;
  const normalizedSession = input.sessionId?.trim() || null;
  const normalizedDescription = normalizedText(input.description);
  const normalizedReferences = input.referenceLinks
    .map((value) => normalizedText(value))
    .filter(Boolean)
    .sort();

  const riskFlags: string[] = [];
  if ((input.recentNetworkAttemptCount ?? 0) >= 8) riskFlags.push('HIGH_VELOCITY_NETWORK');
  if ((input.distinctEmailsOnNetwork ?? 0) >= 4) riskFlags.push('MULTI_ACCOUNT_NETWORK');
  if ((input.recentContentAttemptCount ?? 0) >= 2) riskFlags.push('REPEATED_CONTENT');
  if ((input.recentReferenceAttemptCount ?? 0) >= 3) riskFlags.push('REPEATED_REFERENCES');

  return {
    emailHash: hmac(secret, 'email', rotationBucket, normalizedEmail),
    networkHash: normalizedIp ? hmac(secret, 'network', rotationBucket, normalizedIp) : null,
    sessionHash: normalizedSession ? hmac(secret, 'session', rotationBucket, normalizedSession) : null,
    contentHash: hmac(secret, 'content', rotationBucket, normalizedDescription),
    referenceHash: normalizedReferences.length
      ? hmac(secret, 'references', rotationBucket, normalizedReferences.join('|'))
      : null,
    rotationBucket,
    riskFlags,
  };
}
