import { NextResponse } from 'next/server';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { notificationPatchSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    await requireOwner();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 401;
    return NextResponse.json({ code: status === 403 ? 'OWNER_REQUIRED' : 'AUTH_REQUIRED' }, { status });
  }

  const parsed = notificationPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_NOTIFICATION_UPDATE' }, { status: 400 });

  const { notificationId } = await params;
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('notifications')
    .update({ read_at: parsed.data.read ? new Date().toISOString() : null })
    .eq('id', notificationId)
    .select('id, read_at')
    .maybeSingle();

  if (error || !data) return NextResponse.json({ code: 'NOTIFICATION_NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ notification: data });
}
