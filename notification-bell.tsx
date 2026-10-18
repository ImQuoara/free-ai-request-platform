'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NotificationCounts } from '@/lib/domain/notifications';

type NotificationItem = {
  id: string;
  title: string;
  detail: string | null;
  request_public_id: string | null;
  created_at: string;
  read_at: string | null;
};

export function NotificationBell({ counts, notifications }: { counts: NotificationCounts; notifications: NotificationItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function markRead(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/admin/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <details className="notification-center">
      <summary className="notification-summary">
        <span aria-hidden="true">🔔</span>
        <span>Notifications</span>
        {counts.unread > 0 && <span className="unread-badge">{counts.unread}</span>}
      </summary>
      <div className="notification-panel">
        <div className="notification-count-grid">
          <span>New <strong>{counts.newRequests}</strong></span>
          <span>Replies <strong>{counts.replies}</strong></span>
          <span>Accepted <strong>{counts.acceptedAction}</strong></span>
          <span>Completed <strong>{counts.completedUnpublished}</strong></span>
          <span>Flags <strong>{counts.abuseFlags}</strong></span>
        </div>
        <div className="notification-list">
          {notifications.length ? notifications.map((item) => (
            <article className={`notification-item ${item.read_at ? 'notification-read' : ''}`} key={item.id}>
              <div><strong>{item.title}</strong>{item.detail && <p>{item.detail}</p>}<time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div>
              {!item.read_at && <button className="text-button" type="button" disabled={busy === item.id} onClick={() => markRead(item.id)}>{busy === item.id ? '…' : 'Mark read'}</button>}
            </article>
          )) : <div className="empty-state">No notifications yet.</div>}
        </div>
      </div>
    </details>
  );
}
