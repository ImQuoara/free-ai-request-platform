import { TrackedPublicLink } from '@/components/public/tracked-public-link';
export type WorkItem = {
  id: string;
  kind: 'audio' | 'video' | 'image' | 'website' | 'other';
  title: string;
  description: string;
  date: string;
  demo?: boolean;
  previewUrl?: string;
  thumbnailUrl?: string;
  publicUrl?: string;
};

function media(item: WorkItem) {
  if (item.kind === 'audio' && item.previewUrl) {
    return <audio className="work-media audio-player" controls preload="none" src={item.previewUrl} />;
  }
  if (item.kind === 'video' && item.previewUrl) {
    return <video className="work-media" controls preload="metadata" src={item.previewUrl} poster={item.thumbnailUrl} />;
  }
  if (item.kind === 'image' && (item.previewUrl || item.thumbnailUrl)) {
    return <img className="work-media" src={item.previewUrl ?? item.thumbnailUrl} alt="" loading="lazy" />;
  }
  return (
    <div className="work-placeholder" aria-hidden="true">
      <span>{item.kind}</span>
    </div>
  );
}

export function WorkGallery({ items }: { items: WorkItem[] }) {
  if (!items.length) {
    return <div className="empty-state">Owner-approved public work will appear here.</div>;
  }

  return (
    <div className="work-grid">
      {items.map((item) => (
        <article className="work-card" key={item.id}>
          {media(item)}
          <div className="work-card-body">
            <div className="work-meta">
              <span>{item.kind}</span>
              <time dateTime={item.date}>{new Date(`${item.date}T12:00:00Z`).toLocaleDateString()}</time>
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="work-actions">
              {item.demo && <span className="demo-badge">Demo layout · not client work</span>}
              {item.publicUrl && (
                <TrackedPublicLink publicId={item.id} href={item.publicUrl}>View public result ↗</TrackedPublicLink>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
