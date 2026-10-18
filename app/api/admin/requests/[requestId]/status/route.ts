import { NextResponse } from 'next/server';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { adminStatusSchema } from '@/lib/validation/admin';
import { mapStatusTransitionRpcError } from '@/lib/domain/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    await requireOwner();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 401;
    return NextResponse.json({ code: status === 403 ? 'OWNER_REQUIRED' : 'AUTH_REQUIRED' }, { status });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON' }, { status: 400 });
  }
  const parsed = adminStatusSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_STATUS' }, { status: 400 });

  const { requestId } = await params;
  const service = createServiceSupabaseClient();
  const { data, error } = await service.rpc('transition_request_status_atomic', {
    p_request_id: requestId,
    p_target_status: parsed.data.targetStatus,
  });

  if (error) {
    const mapped = mapStatusTransitionRpcError(error.message ?? '');
    return NextResponse.json({ code: mapped.code }, { status: mapped.status });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ request: row });
}
