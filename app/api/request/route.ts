import { NextResponse } from 'next/server';
import { AccessError, requireUser } from '@/lib/auth/guards';
import { buildAbuseContext } from '@/lib/security/abuse';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { sanitizeReferrerHost } from '@/lib/security/urls';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { requestSubmissionSchema } from '@/lib/validation/request';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 24_000;

type GuardError = { message?: string | null; details?: string | null };

function nextUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function mapGuardRpcError(error: GuardError, now = new Date()) {
  const message = error.message ?? '';
  if (message.includes('cooldown_active')) {
    let retryAfterSeconds = 1;
    try {
      const detail = JSON.parse(error.details ?? '{}') as { remaining_seconds?: number };
      retryAfterSeconds = Math.max(1, Number(detail.remaining_seconds) || 1);
    } catch {
      retryAfterSeconds = 1;
    }
    return { status: 429, body: { code: 'COOLDOWN' as const, retryAfterSeconds } };
  }
  if (message.includes('daily_cap_reached')) {
    return {
      status: 429,
      body: { code: 'DAILY_CAP' as const, nextEligibleAt: nextUtcDay(now).toISOString() },
    };
  }
  if (message.includes('requests_closed')) {
    return { status: 409, body: { code: 'CLOSED' as const, message: 'Requests are currently closed.' } };
  }
  return { status: 500, body: { code: 'SUBMISSION_FAILED' as const, message: 'Request could not be submitted.' } };
}

function remoteIp(request: Request) {
  return (
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null
  );
}

async function abuseCounts(
  service: ReturnType<typeof createServiceSupabaseClient>,
  base: ReturnType<typeof buildAbuseContext>,
) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  let recentNetworkAttemptCount = 0;
  let distinctEmailsOnNetwork = 0;
  let recentContentAttemptCount = 0;
  let recentReferenceAttemptCount = 0;

  if (base.networkHash) {
    const { data } = await service
      .from('submission_attempts')
      .select('email_hash')
      .eq('network_hash', base.networkHash)
      .gte('created_at', tenMinutesAgo)
      .limit(50);
    const hashes = (data ?? []).map((row: { email_hash: string }) => row.email_hash);
    recentNetworkAttemptCount = hashes.length;
    distinctEmailsOnNetwork = new Set(hashes).size;
  }

  const countRecent = async (column: 'content_hash' | 'reference_hash', value: string | null) => {
    if (!value) return 0;
    const { count } = await service
      .from('submission_attempts')
      .select('id', { count: 'exact', head: true })
      .eq(column, value)
      .gte('created_at', dayAgo);
    return count ?? 0;
  };

  recentContentAttemptCount = await countRecent('content_hash', base.contentHash);
  recentReferenceAttemptCount = await countRecent('reference_hash', base.referenceHash);

  return {
    recentNetworkAttemptCount,
    distinctEmailsOnNetwork,
    recentContentAttemptCount,
    recentReferenceAttemptCount,
  };
}

export async function POST(request: Request) {
  let identity;
  try {
    identity = await requireUser();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 401;
    return NextResponse.json(
      { code: 'AUTH_REQUIRED', message: 'Verified email is required.' },
      { status },
    );
  }

  const advertisedLength = Number(request.headers.get('content-length') ?? 0);
  if (advertisedLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large.' },
      { status: 413 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large.' },
      { status: 413 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const parsed = requestSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'INVALID_REQUEST',
        message: 'Please review the request fields.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (input.honeypot.trim()) {
    return NextResponse.json(
      { code: 'INVALID_REQUEST', message: 'Request could not be submitted.' },
      { status: 400 },
    );
  }

  const ip = remoteIp(request);
  const turnstile = await verifyTurnstile(input.turnstileToken, ip ?? undefined);
  if (!turnstile.success) {
    // Record only rotating HMAC identifiers; never persist the raw network address.
    try {
      const failureContext = buildAbuseContext({
        email: identity.email,
        ip,
        sessionId: input.sessionId,
        description: input.description,
        referenceLinks: input.referenceLinks,
      });
      const failureService = createServiceSupabaseClient();
      await failureService.from('submission_attempts').insert({
        requester_id: identity.id,
        email_hash: failureContext.emailHash,
        network_hash: failureContext.networkHash,
        session_hash: failureContext.sessionHash,
        content_hash: failureContext.contentHash,
        reference_hash: failureContext.referenceHash,
        outcome: 'verification_failed',
        reason: turnstile.errorCodes.slice(0, 8).join(',').slice(0, 300) || 'turnstile_failed',
      });
    } catch {
      // Security telemetry must never turn a failed verification into an application crash.
    }
    return NextResponse.json(
      { code: 'HUMAN_VERIFICATION_FAILED', message: 'Human verification failed. Please retry.' },
      { status: 400 },
    );
  }

  const service = createServiceSupabaseClient();
  const source = {
    utm_source: input.source.utmSource.toLowerCase().slice(0, 80) || null,
    utm_campaign: input.source.utmCampaign.slice(0, 120) || null,
    referrer_host: sanitizeReferrerHost(input.source.referrer),
  };

  let baseContext;
  try {
    baseContext = buildAbuseContext({
      email: identity.email,
      ip,
      sessionId: input.sessionId,
      description: input.description,
      referenceLinks: input.referenceLinks,
    });
  } catch {
    return NextResponse.json(
      { code: 'SERVER_CONFIGURATION', message: 'Request protection is not configured.' },
      { status: 503 },
    );
  }

  const counts = await abuseCounts(service, baseContext);
  const abuse = buildAbuseContext({
    email: identity.email,
    ip,
    sessionId: input.sessionId,
    description: input.description,
    referenceLinks: input.referenceLinks,
    ...counts,
  });

  const attemptBase = {
    requester_id: identity.id,
    email_hash: abuse.emailHash,
    network_hash: abuse.networkHash,
    session_hash: abuse.sessionHash,
    content_hash: abuse.contentHash,
    reference_hash: abuse.referenceHash,
  };

  const { data, error } = await service.rpc('submit_request_guarded', {
    p_requester_id: identity.id,
    p_name: input.name,
    p_email: identity.email,
    p_discord: input.discord || null,
    p_type: input.type,
    p_description: input.description,
    p_reference_links: input.referenceLinks,
    p_consents: input.consents,
    p_source: source,
    p_risk_flags: abuse.riskFlags,
  });

  if (error) {
    await service.from('submission_attempts').insert({
      ...attemptBase,
      outcome: 'rejected',
      reason: error.message.slice(0, 300),
    });
    const mapped = mapGuardRpcError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }

  const requestRow = Array.isArray(data) ? data[0] : data;
  if (!requestRow?.id || !requestRow.public_id) {
    return NextResponse.json(
      { code: 'SUBMISSION_FAILED', message: 'Request was not confirmed.' },
      { status: 500 },
    );
  }

  await service.from('submission_attempts').insert({
    ...attemptBase,
    outcome: abuse.riskFlags.length ? 'flagged' : 'accepted',
    reason: abuse.riskFlags.length ? abuse.riskFlags.join(',').slice(0, 300) : null,
  });

  const { data: settings } = await service
    .from('site_settings')
    .select('cooldown_minutes')
    .eq('id', 'global')
    .single();
  const cooldownMinutes = Number(settings?.cooldown_minutes ?? 10);
  const nextEligibleAt =
    cooldownMinutes > 0
      ? new Date(new Date(requestRow.created_at).getTime() + cooldownMinutes * 60_000).toISOString()
      : null;

  return NextResponse.json(
    { requestId: requestRow.id, publicId: requestRow.public_id, nextEligibleAt },
    { status: 201 },
  );
}
