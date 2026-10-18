'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type DeliveryLink = { label: string; url: string };

export function ProjectDetailsForm({ requestId, ownerNotes, deliveryLinks }: { requestId: string; ownerNotes: string; deliveryLinks: DeliveryLink[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const linksRaw = String(data.get('deliveryLinks') ?? '');
    const links = linksRaw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const separator = line.indexOf('|');
      if (separator < 0) return { label: 'Open delivery', url: line };
      return { label: line.slice(0, separator).trim() || 'Open delivery', url: line.slice(separator + 1).trim() };
    });
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/details`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ownerNotes: String(data.get('ownerNotes') ?? ''), deliveryLinks: links }) });
      const result = await response.json();
      setMessage(response.ok ? 'Private project details saved.' : result.code ?? 'Update failed.');
      if (response.ok) router.refresh();
    } catch {
      setMessage('Network error. Changes were not confirmed.');
    } finally { setBusy(false); }
  }

  return (
    <form className="admin-form panel" onSubmit={submit}>
      <label>Private owner notes<textarea name="ownerNotes" rows={6} maxLength={5000} defaultValue={ownerNotes} placeholder="Only you can see these notes." /></label>
      <label>Approved delivery links <span className="label-note">one per line: Label | https://…</span><textarea name="deliveryLinks" rows={5} defaultValue={deliveryLinks.map((item) => `${item.label} | ${item.url}`).join('\n')} placeholder="Final song | https://…" /></label>
      <div className="form-submit-row"><p className="privacy-note">Only approved HTTPS delivery links become visible in this requester’s private portal.</p><button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save private details'}</button></div>
      {message && <p className="form-message form-success" role="status">{message}</p>}
    </form>
  );
}
