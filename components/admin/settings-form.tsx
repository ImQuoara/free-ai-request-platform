'use client';

import { FormEvent, useState } from 'react';
import type { SiteSettings } from '@/lib/domain/settings';

function localDateTimeValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const reopenRaw = String(data.get('reopensAt') ?? '').trim();
    const capRaw = String(data.get('perPersonDailyCap') ?? '').trim();
    const body = {
      requestsOpen: data.get('requestsOpen') === 'on',
      spotsAvailable: Number(data.get('spotsAvailable')),
      reopensAt: reopenRaw ? new Date(reopenRaw).toISOString() : null,
      cooldownMinutes: Number(data.get('cooldownMinutes')),
      perPersonDailyCap: capRaw ? Number(capRaw) : null,
      autoDecrementOnAccept: data.get('autoDecrementOnAccept') === 'on',
      publicActivityEnabled: data.get('publicActivityEnabled') === 'on',
    };

    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      setMessage(response.ok ? 'Settings saved. Public availability updates immediately.' : result.code ?? 'Settings update failed.');
    } catch {
      setMessage('Network error. Settings were not confirmed as changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form panel" onSubmit={submit}>
      <div className="toggle-row"><div><strong>Request intake</strong><span>Open or close submissions immediately.</span></div><input aria-label="Request intake open" type="checkbox" name="requestsOpen" defaultChecked={settings.requestsOpen} /></div>
      <div className="admin-form-grid">
        <label>Free spots available<input type="number" name="spotsAvailable" min="0" max="100000" defaultValue={settings.spotsAvailable} required /></label>
        <label>Reopens at <span className="label-note">optional</span><input type="datetime-local" name="reopensAt" defaultValue={localDateTimeValue(settings.reopensAt)} /></label>
        <label>Cooldown minutes<input type="number" name="cooldownMinutes" min="1" max="1440" defaultValue={settings.cooldownMinutes} required /></label>
        <label>Daily submissions per person <span className="label-note">blank = unlimited</span><input type="number" name="perPersonDailyCap" min="1" max="100" defaultValue={settings.perPersonDailyCap ?? ''} /></label>
      </div>
      <div className="toggle-row"><div><strong>Consume a spot on acceptance</strong><span>Submission alone never consumes a free spot.</span></div><input aria-label="Auto decrement spots on acceptance" type="checkbox" name="autoDecrementOnAccept" defaultChecked={settings.autoDecrementOnAccept} /></div>
      <div className="toggle-row"><div><strong>Public activity</strong><span>Allows only the safe anonymous activity projection.</span></div><input aria-label="Public activity enabled" type="checkbox" name="publicActivityEnabled" defaultChecked={settings.publicActivityEnabled} /></div>
      <div className="form-submit-row"><p className="privacy-note">Clearing “Reopens at” stores no reopen date.</p><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save owner settings'}</button></div>
      {message && <p className="form-message form-success" role="status">{message}</p>}
    </form>
  );
}
