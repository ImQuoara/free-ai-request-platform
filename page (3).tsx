import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MessageThread } from '@/components/portal/message-thread';
import { requireUser } from '@/lib/auth/guards';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DeliveryLink = { label?: string; url?: string };

type RequestRow = {
  id: string;
  public_id: string;
  request_type: string;
  status: string;
  description: string;
  reference_links: string[];
  delivery_links: DeliveryLink[];
  created_at: string;
};

export default async function ProjectPage({ params }: { params: Promise<{ requestId: string }> }) {
  let identity;
  try {
    identity = await requireUser();
  } catch {
    redirect('/request?auth=required');
  }

  const { requestId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: request, error } = await supabase
    .from('requests')
    .select('id, public_id, request_type, status, description, reference_links, delivery_links, created_at')
    .eq('id', requestId)
    .maybeSingle();

  // RLS makes another user's UUID indistinguishable from a nonexistent UUID.
  if (error || !request) notFound();

  const { data: messages } = await supabase
    .from('request_messages')
    .select('id, sender_role, body, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  // Only after RLS proved ownership do we use the service client to mark owner replies read.
  const service = createServiceSupabaseClient();
  await service
    .from('request_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('request_id', requestId)
    .eq('sender_role', 'owner')
    .is('read_at', null);

  const row = request as RequestRow;
  const deliveries = Array.isArray(row.delivery_links) ? row.delivery_links.filter((item) => item && typeof item.url === 'string') : [];

  return (
    <main className="site-shell portal-shell">
      <div className="breadcrumb"><Link href="/portal">← Your projects</Link><span>{row.public_id}</span></div>
      <header className="project-header panel">
        <div><span className="mini-label">{row.request_type} · submitted {new Date(row.created_at).toLocaleDateString()}</span><h1>{row.public_id}</h1><p className="hero-copy">{row.description}</p></div>
        <span className="status-pill status-large">{row.status.replaceAll('_', ' ')}</span>
      </header>

      <div className="project-detail-grid">
        <section className="panel project-details">
          <span className="mini-label">Your submitted references</span>
          <h2>Request details</h2>
          {Array.isArray(row.reference_links) && row.reference_links.length ? <ul className="link-list">{row.reference_links.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>)}</ul> : <p className="hero-copy">No reference links were supplied.</p>}

          <div className="delivery-block">
            <span className="mini-label">Approved delivery</span>
            {deliveries.length ? <ul className="delivery-list">{deliveries.map((delivery, index) => <li key={`${delivery.url}-${index}`}><a className="button" href={delivery.url} target="_blank" rel="noreferrer">{delivery.label || `Open delivery ${index + 1}`}</a></li>)}</ul> : <p className="hero-copy">No delivery link has been approved yet.</p>}
          </div>
        </section>

        <MessageThread requestId={row.id} messages={(messages ?? []) as Array<{ id: string; sender_role: 'requester' | 'owner'; body: string; created_at: string }>} />
      </div>
      <p className="privacy-note portal-privacy-note">Signed in as {identity.email}. No other requester can browse this project or thread.</p>
    </main>
  );
}
