import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DashboardMetrics } from '@/components/admin/dashboard-metrics';
import { NotificationBell } from '@/components/admin/notification-bell';
import { RequestQueue } from '@/components/admin/request-queue';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { notificationCounts, type NotificationRow } from '@/lib/domain/notifications';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  try {
    await requireOwner();
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) redirect('/request?auth=required');
    notFound();
  }

  const service = createServiceSupabaseClient();
  const [{ data: requests }, { data: notifications }, { data: settings }] = await Promise.all([
    service.from('requests').select('id, public_id, request_type, status, name, requester_email, risk_flags, created_at').order('created_at', { ascending: false }).limit(250),
    service.from('notifications').select('id, type, title, detail, request_public_id, read_at, created_at').order('created_at', { ascending: false }).limit(50),
    service.from('site_settings').select('requests_open, spots_available').eq('id', 'global').single(),
  ]);

  const requestRows = requests ?? [];
  const counts = notificationCounts((notifications ?? []) as NotificationRow[]);
  const statusCount = (status: string) => requestRows.filter((request: { status: string }) => request.status === status).length;

  return (
    <main className="site-shell admin-shell">
      <header className="admin-header">
        <div><span className="mini-label">Owner command center</span><h1>Projects, requests &amp; signals.</h1><p className="hero-copy">Private operational data stays here. Public visitors never receive this payload.</p></div>
        <div className="admin-header-actions"><NotificationBell counts={counts} notifications={(notifications ?? []) as never[]} /><Link className="button" href="/admin/analytics">Analytics</Link><Link className="button" href="/admin/settings">Availability &amp; limits</Link><Link className="button" href="/">Public site</Link></div>
      </header>

      <DashboardMetrics metrics={[
        { label: 'New requests', value: statusCount('NEW') },
        { label: 'Accepted', value: statusCount('ACCEPTED') },
        { label: 'In progress', value: statusCount('IN_PROGRESS') },
        { label: 'Completed', value: statusCount('COMPLETED') },
        { label: 'Free spots', value: settings?.spots_available ?? 0, detail: settings?.requests_open ? 'intake open' : 'intake closed' },
        { label: 'Unread alerts', value: counts.unread },
      ]} />

      <RequestQueue requests={requestRows as never[]} />
    </main>
  );
}
