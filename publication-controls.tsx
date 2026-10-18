'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Showcase = { title: string; description: string; media_type: string; asset_url: string | null; page_url: string | null } | null;

export function PublicationControls({ requestId, activityEnabled, safeTitle, showcase }: { requestId: string; activityEnabled: boolean; safeTitle: string | null; showcase: Showcase }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const published = data.get('showcasePublished') === 'on';
    const payload = {
      activityEnabled: data.get('activityEnabled') === 'on',
      safeTitle: String(data.get('safeTitle') ?? '').trim() || null,
      showcase: published ? {
        published: true,
        title: String(data.get('showcaseTitle') ?? ''),
        description: String(data.get('showcaseDescription') ?? ''),
        mediaType: String(data.get('mediaType') ?? 'other'),
        assetUrl: String(data.get('assetUrl') ?? '').trim() || null,
        pageUrl: String(data.get('pageUrl') ?? '').trim() || null,
      } : { published: false },
    };
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/publication`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      setMessage(response.ok ? 'Public visibility settings saved.' : body.code ?? 'Publication update failed.');
      if (response.ok) router.refresh();
    } catch { setMessage('Network error. Publication was not confirmed as changed.'); }
    finally { setBusy(false); }
  }

  return (
    <form className="admin-form panel" onSubmit={submit}>
      <span className="mini-label">Owner-controlled publication</span>
      <div className="toggle-row"><div><strong>Anonymous public request activity</strong><span>Publishes only safe ID, type, status, date and your optional safe title.</span></div><input type="checkbox" name="activityEnabled" defaultChecked={activityEnabled} /></div>
      <label>Safe public title<input name="safeTitle" maxLength={120} defaultValue={safeTitle ?? ''} placeholder="Optional owner-written title" /></label>
      <div className="toggle-row"><div><strong>Publish finished work to gallery</strong><span>Separate approval from public request activity.</span></div><input type="checkbox" name="showcasePublished" defaultChecked={Boolean(showcase)} /></div>
      <div className="admin-form-grid"><label>Gallery title<input name="showcaseTitle" maxLength={120} defaultValue={showcase?.title ?? ''} /></label><label>Media type<select name="mediaType" defaultValue={showcase?.media_type ?? 'other'}><option>audio</option><option>video</option><option>image</option><option>website</option><option>other</option></select></label></div>
      <label>Safe public description<textarea name="showcaseDescription" maxLength={320} rows={3} defaultValue={showcase?.description ?? ''} /></label>
      <div className="admin-form-grid"><label>Public asset URL <span className="label-note">HTTPS only</span><input name="assetUrl" type="url" defaultValue={showcase?.asset_url ?? ''} /></label><label>Public result URL <span className="label-note">HTTPS only</span><input name="pageUrl" type="url" defaultValue={showcase?.page_url ?? ''} /></label></div>
      <p className="privacy-note">No requester email, name, prompt, references, messages, notes, risk flags, or raw project UUID is accepted by this publication endpoint.</p>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save publication controls'}</button>
      {message && <p className="form-message form-success" role="status">{message}</p>}
    </form>
  );
}
