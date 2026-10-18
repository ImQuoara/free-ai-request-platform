'use client';

import { useEffect } from 'react';

function sessionId() {
  const key = 'free-ai-public-analytics-session';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID().replaceAll('-', '');
  window.sessionStorage.setItem(key, value);
  return value;
}

export function AnalyticsBeacon({ path }: { path: '/' | '/request' }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName: 'page_view',
        path,
        source: params.get('utm_source') ?? '',
        campaign: params.get('utm_campaign') ?? '',
        referrer: document.referrer,
        sessionId: sessionId(),
      }),
    }).catch(() => undefined);
  }, [path]);
  return null;
}
