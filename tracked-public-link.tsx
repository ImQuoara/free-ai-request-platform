'use client';

import type { MouseEvent, ReactNode } from 'react';

function getSessionId() {
  const key = 'free-ai-public-analytics-session';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID().replaceAll('-', '');
  window.sessionStorage.setItem(key, value);
  return value;
}

export function TrackedPublicLink({ publicId, href, children }: { publicId: string; href: string; children: ReactNode }) {
  function track(_event: MouseEvent<HTMLAnchorElement>) {
    if (!/^R[A-F0-9]{8}$/.test(publicId)) return;
    const params = new URLSearchParams(window.location.search);
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ eventName: 'work_view', path: `/work/${publicId}`, source: params.get('utm_source') ?? '', campaign: params.get('utm_campaign') ?? '', referrer: document.referrer, sessionId: getSessionId() }),
    }).catch(() => undefined);
  }
  return <a className="text-link" href={href} target="_blank" rel="noreferrer" onClick={track}>{children}</a>;
}
