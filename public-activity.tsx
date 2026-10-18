type Activity = {
  public_id: string;
  request_type: string;
  public_status: string;
  created_date: string;
  safe_title: string | null;
};

export function PublicActivity({ items }: { items: Activity[] }) {
  if (!items.length) return <div className="empty-state">No owner-approved public request activity yet.</div>;
  return (
    <div className="activity-feed">
      {items.map((item) => (
        <article className="activity-item" key={item.public_id}>
          <div><span className="activity-dot" aria-hidden="true" /><strong>{item.safe_title || `${item.request_type} request`}</strong></div>
          <div className="activity-meta"><span>{item.public_id}</span><span>{item.public_status.replaceAll('_',' ')}</span><time dateTime={item.created_date}>{new Date(`${item.created_date}T12:00:00Z`).toLocaleDateString()}</time></div>
        </article>
      ))}
    </div>
  );
}
