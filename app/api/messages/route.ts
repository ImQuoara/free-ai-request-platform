import { NextResponse } from 'next/server';
import type { VerifiedIdentity } from '@/lib/auth/guards';
import { AccessError, requireUser } from '@/lib/auth/guards';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { messageSubmissionSchema } from '@/lib/validation/message';
import { classifyMessageActor } from '@/lib/messages/classify-actor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8_000;


function notFoundResponse() {
  return NextResponse.json(
    { code: 'PROJECT_NOT_FOUND', message: 'Project was not found or is not accessible.' },
    { status: 404 },
  );
}

export async function POST(request: Request) {
  let identity: VerifiedIdentity;
  try {
    identity = await requireUser();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 401;
    return NextResponse.json({ code: 'AUTH_REQUIRED', message: 'Verified email is required.' }, { status });
  }

  const advertisedLength = Number(request.headers.get('content-length') ?? 0);
  if (advertisedLength > MAX_BODY_BYTES) {
    return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Message is too large.' }, { status: 413 });
  }

  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Invalid request body.' }, { status: 400 });
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Message is too large.' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = messageSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID_MESSAGE', message: 'Please review your message.' }, { status: 400 });
  }

  const { requestId, message } = parsed.data;
  const actor = classifyMessageActor(identity, process.env.OWNER_EMAIL);

  if (actor === 'owner') {
    const service = createServiceSupabaseClient();
    const { data: target, error: targetError } = await service
      .from('requests')
      .select('id, public_id')
      .eq('id', requestId)
      .maybeSingle();

    if (targetError || !target) return notFoundResponse();

    const { data: inserted, error: insertError } = await service
      .from('request_messages')
      .insert({ request_id: requestId, sender_id: identity.id, sender_role: 'owner', body: message })
      .select('id, created_at')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ code: 'MESSAGE_FAILED', message: 'Message was not sent.' }, { status: 500 });
    }

    return NextResponse.json({ messageId: inserted.id, createdAt: inserted.created_at }, { status: 201 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: target, error: targetError } = await supabase
    .from('requests')
    .select('id, public_id')
    .eq('id', requestId)
    .maybeSingle();

  // Same response for a nonexistent UUID and another requester's UUID.
  if (targetError || !target) return notFoundResponse();

  const { data: inserted, error: insertError } = await supabase
    .from('request_messages')
    .insert({ request_id: requestId, sender_id: identity.id, sender_role: 'requester', body: message })
    .select('id, created_at')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ code: 'MESSAGE_FAILED', message: 'Message was not sent.' }, { status: 500 });
  }

  return NextResponse.json({ messageId: inserted.id, createdAt: inserted.created_at }, { status: 201 });
}
