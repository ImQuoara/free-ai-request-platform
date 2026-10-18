import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guards';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PortalRequest = {
  id: string;
  public_id: string;
  request_type: string;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
  delivery_links: unknown[];
};

export default async function PortalPage() {
  try {
    await requireUser();
  } catch {
    redirect('/request?auth=required');
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: requests }, { data: unread }] = await Promise.all([
    supabase
      .from('requests')
      .select('id, public_id, request_type, status, description, created_at, updated_at, delivery_links')
      .order('created_at', { ascending: false }),
    supabase
      .from('request_messages')
      .select('request_id')
      .eq('sender_role', 'owner')
      .is('read_at', null),
  ]);

  const unreadCounts = new Map<string, number>();
  for (const row of unread ?? []) unreadCounts.set(row.request_id, (unreadCounts.get(row.request_id) ?? 0) + 1);

  return (
    <main className="site-shell portal-shell">
      <header className="portal-header">
        <div><span className="mini-label">Private requester portal</span><h1>Your projects</h1><p className="hero-copy">Only projects tied to your verified account are available here.</p></div>
        <div className="actions"><Link className="button" href="/">Public site</Link><Link className="button button-primary" href="/request">New request</Link></div>
      </header>

      <section className="portal-grid" aria-label="Your private requests">
        {(requests as PortalRequest[] | null)?.length ? (requests as PortalRequest[]).map((request) => {
          const unreadCount = unreadCounts.get(request.id) ?? 0;
          return (
            <Link className="project-card" href={`/portal/${request.id}`} key={request.id}>
              <div className="project-card-top"><span className="status-pill">{request.status.replaceAll('_', ' ')}</span>{unreadCount > 0 && <span className="unread-badge" aria-label={`${unreadCount} unread owner replies`}>{unreadCount}</span>}</div>
              <span className="mini-label">{request.request_type} · {request.public_id}</span>
              <h2>{request.description.slice(0, 100)}{request.description.length > 100 ? '…' : ''}</h2>
              <div className="project-card-meta"><span>Submitted {new Date(request.created_at).toLocaleDateString()}</span><span>{Array.isArray(request.delivery_links) ? request.delivery_links.length : 0} delivery link(s)</span></div>
            </Link>
          );
        }) : <div className="empty-state">You do not have any requests yet. <Link href="/request">Submit your first request.</Link></div>}
      </section>
    </main>
  );
}
