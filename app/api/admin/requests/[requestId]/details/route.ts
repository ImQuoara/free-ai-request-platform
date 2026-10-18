import { NextResponse } from 'next/server';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { adminRequestDetailsSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    await requireOwner();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 401;
    return NextResponse.json({ code: status === 403 ? 'OWNER_REQUIRED' : 'AUTH_REQUIRED' }, { status });
  }

  const parsed = adminRequestDetailsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_PROJECT_DETAILS' }, { status: 400 });

  const { requestId } = await params;
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('requests')
    .update({ owner_notes: parsed.data.ownerNotes || null, delivery_links: parsed.data.deliveryLinks })
    .eq('id', requestId)
    .select('id, owner_notes, delivery_links')
    .maybeSingle();

  if (error || !data) return NextResponse.json({ code: 'PROJECT_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ request: data });
}
