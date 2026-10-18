import Link from 'next/link';

type QueueItem = {
  id: string;
  public_id: string;
  request_type: string;
  status: string;
  name: string;
  requester_email: string;
  risk_flags: string[];
  created_at: string;
};

export function RequestQueue({ requests }: { requests: QueueItem[] }) {
  return (
    <section className="admin-section">
      <div className="admin-section-head"><div><span className="mini-label">Private queue</span><h2>Requests &amp; projects</h2></div><span className="status-pill">{requests.length} total</span></div>
      <div className="request-queue">
        {requests.length ? requests.map((request) => (
          <Link className="queue-row" href={`/admin/requests/${request.id}`} key={request.id}>
            <div><span className="mini-label">{request.public_id} · {request.request_type}</span><strong>{request.name}</strong><small>{request.requester_email}</small></div>
            <div className="queue-row-right"><span className="status-pill">{request.status.replaceAll('_', ' ')}</span>{Array.isArray(request.risk_flags) && request.risk_flags.length > 0 && <span className="risk-badge">{request.risk_flags.length} flag{request.risk_flags.length === 1 ? '' : 's'}</span>}<time dateTime={request.created_at}>{new Date(request.created_at).toLocaleDateString()}</time></div>
          </Link>
        )) : <div className="empty-state">No requests have been submitted yet.</div>}
      </div>
    </section>
  );
}
