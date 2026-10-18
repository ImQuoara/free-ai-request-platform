import { NextResponse } from 'next/server';
import { isBlockedAiCrawler } from '@/lib/security/crawlers';
import { createRotatingVisitHash } from '@/lib/security/analytics-id';
import { normalizeAttribution } from '@/lib/domain/analytics';
import { sanitizeReferrerHost } from '@/lib/security/urls';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { analyticsVisitSchema } from '@/lib/validation/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4_096;
const GENERIC_BOT = /(bot|crawler|spider|slurp|preview|facebookexternalhit|headless)/i;

function requestIp(request: Request) {
  return request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (isBlockedAiCrawler(userAgent) || GENERIC_BOT.test(userAgent)) return new NextResponse(null, { status: 204 });

  const advertisedLength = Number(request.headers.get('content-length') ?? 0);
  if (advertisedLength > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let json: unknown;
  try { json = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  const parsed = analyticsVisitSchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret) return new NextResponse(null, { status: 204 });

  let sessionHash: string;
  try {
    sessionHash = createRotatingVisitHash(secret, requestIp(request), parsed.data.sessionId);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const service = createServiceSupabaseClient();
  await service.from('analytics_events').insert({
    event_name: parsed.data.eventName,
    path: parsed.data.path,
    source: normalizeAttribution(parsed.data.source, 80) || null,
    campaign: normalizeAttribution(parsed.data.campaign, 120) || null,
    referrer_host: sanitizeReferrerHost(parsed.data.referrer),
    session_hash: sessionHash,
  });

  return new NextResponse(null, { status: 204 });
}
