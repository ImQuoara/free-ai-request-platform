import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ProjectDetailsForm } from '@/components/admin/project-details-form';
import { PublicationControls } from '@/components/admin/publication-controls';
import { StatusControls } from '@/components/admin/status-controls';
import { MessageThread } from '@/components/portal/message-thread';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import type { RequestStatus } from '@/lib/domain/requests';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

type DeliveryLink = { label: string; url: string };
type OwnerRequest = {
  id: string;
  public_id: string;
  request_type: string;
  status: RequestStatus;
  name: string;
  requester_email: string;
  discord: string | null;
  description: string;
  reference_links: string[];
  delivery_links: DeliveryLink[];
  review_confirmed: boolean;
  rights_confirmed: boolean;
  scope_confirmed: boolean;
  showcase_consent: boolean;
  credit_consent: boolean;
  owner_notes: string | null;
  public_activity_enabled: boolean;
  risk_flags: string[];
  source_context: Record<string, unknown>;
  created_at: string;
};

export default async function AdminRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  try {
    await requireOwner();
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) redirect('/request?auth=required');
    notFound();
  }

  const { requestId } = await params;
  const service = createServiceSupabaseClient();
  const { data, error } = await service.from('requests').select('*').eq('id', requestId).maybeSingle();
  if (error || !data) notFound();
  const request = data as OwnerRequest;

  const [{ data: messages }, { data: publicActivity }, { data: showcase }] = await Promise.all([
    service.from('request_messages').select('id, sender_role, body, created_at').eq('request_id', requestId).order('created_at', { ascending: true }),
    service.from('public_request_activity').select('safe_title').eq('public_id', request.public_id).maybeSingle(),
    service.from('public_showcase_items').select('title, description, media_type, asset_url, page_url').eq('request_public_id', request.public_id).maybeSingle(),
  ]);

  await Promise.all([
    service.from('request_messages').update({ read_at: new Date().toISOString() }).eq('request_id', requestId).eq('sender_role', 'requester').is('read_at', null),
    service.from('notifications').update({ read_at: new Date().toISOString() }).eq('request_public_id', request.public_id).is('read_at', null),
  ]);

  const references = Array.isArray(request.reference_links) ? request.reference_links : [];
  const deliveryLinks = Array.isArray(request.delivery_links) ? request.delivery_links : [];
  const riskFlags = Array.isArray(request.risk_flags) ? request.risk_flags : [];

  return (
    <main className="site-shell admin-shell">
      <div className="breadcrumb"><Link href="/admin">← Request queue</Link><span>{request.public_id}</span></div>
      <header className="admin-project-header panel">
        <div><span className="mini-label">{request.request_type} · {request.public_id}</span><h1>{request.name}</h1><p className="hero-copy">{request.requester_email}{request.discord ? ` · Discord: ${request.discord}` : ''}</p></div>
        <StatusControls requestId={request.id} currentStatus={request.status} />
      </header>

      <div className="admin-project-grid">
        <div className="admin-project-main">
          <section className="panel admin-private-card"><span className="mini-label">Full private request</span><h2>Brief</h2><p className="long-copy">{request.description}</p><div className="consent-summary"><span>Review ✓</span><span>Rights ✓</span><span>Fixed scope ✓</span><span>Showcase ✓</span><span>Credit ✓</span></div></section>

          <section className="panel admin-private-card"><span className="mini-label">Private references</span><h2>Links &amp; source</h2>{references.length ? <ul className="link-list">{references.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>)}</ul> : <p className="hero-copy">No references supplied.</p>}<pre className="source-context">{JSON.stringify(request.source_context ?? {}, null, 2)}</pre></section>

          <ProjectDetailsForm requestId={request.id} ownerNotes={request.owner_notes ?? ''} deliveryLinks={deliveryLinks} />
          <PublicationControls requestId={request.id} activityEnabled={request.public_activity_enabled} safeTitle={publicActivity?.safe_title ?? null} showcase={showcase ?? null} />
          <MessageThread requestId={request.id} messages={(messages ?? []) as Array<{ id: string; sender_role: 'requester' | 'owner'; body: string; created_at: string }>} viewerRole="owner" />
        </div>

        <aside className="admin-project-side">
          <section className="panel admin-private-card"><span className="mini-label">Risk review</span><h2>{riskFlags.length ? `${riskFlags.length} flag${riskFlags.length === 1 ? '' : 's'}` : 'No automated flags'}</h2>{riskFlags.length ? <ul className="risk-list">{riskFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p className="hero-copy">No abuse pattern was attached to this submission.</p>}</section>
          <section className="panel admin-private-card"><span className="mini-label">Created</span><p className="hero-copy">{new Date(request.created_at).toLocaleString()}</p><p className="privacy-note">This entire owner view is private and is never serialized into public activity.</p></section>
        </aside>
      </div>
    </main>
  );
}
