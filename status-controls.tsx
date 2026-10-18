'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { RequestStatus } from '@/lib/domain/requests';

const TARGETS: Record<RequestStatus, RequestStatus[]> = {
  NEW: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['IN_PROGRESS', 'REJECTED'],
  REJECTED: ['NEW'],
  IN_PROGRESS: ['COMPLETED', 'REJECTED'],
  COMPLETED: ['PUBLISHED', 'IN_PROGRESS'],
  PUBLISHED: ['COMPLETED'],
};

export function StatusControls({ requestId, currentStatus }: { requestId: string; currentStatus: RequestStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<RequestStatus | null>(null);
  const [error, setError] = useState('');

  async function change(targetStatus: RequestStatus) {
    setBusy(targetStatus);
    setError('');
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetStatus }) });
      const body = await response.json();
      if (!response.ok) { setError(body.code ?? 'Status update failed.'); return; }
      router.refresh();
    } catch {
      setError('Network error. Status was not confirmed as changed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="status-controls">
      <span className="mini-label">Project status</span>
      <div className="status-action-row">{TARGETS[currentStatus].map((target) => <button className={target === 'ACCEPTED' ? 'button button-primary' : 'button'} type="button" key={target} onClick={() => change(target)} disabled={Boolean(busy)}>{busy === target ? 'Updating…' : target.replaceAll('_', ' ')}</button>)}</div>
      {error && <p className="form-message form-error" role="status">{error}</p>}
    </div>
  );
}
