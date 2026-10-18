import { createHmac } from 'node:crypto';

export function rotationBucket(at: Date) {
  return at.toISOString().slice(0, 10);
}

export function createRotatingVisitHash(secret: string, ip: string | null, sessionId: string, at = new Date()) {
  if (secret.length < 16) throw new Error('Analytics hash secret must be at least 16 characters.');
  const bucket = rotationBucket(at);
  const normalizedIp = ip?.trim().toLowerCase() || 'no-ip';
  const normalizedSession = sessionId.trim();
  return createHmac('sha256', secret)
    .update(`visit:${bucket}:${normalizedIp}:${normalizedSession}`)
    .digest('hex');
}
