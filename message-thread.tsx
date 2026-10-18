'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type ThreadMessage = {
  id: string;
  sender_role: 'requester' | 'owner';
  body: string;
  created_at: string;
};

export function MessageThread({
  requestId,
  messages,
  viewerRole = 'requester',
}: {
  requestId: string;
  messages: ThreadMessage[];
  viewerRole?: 'requester' | 'owner';
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = String(data.get('message') ?? '').trim();
    if (!message) return;

    setState('sending');
    setError('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId, message }),
      });
      const body = await response.json();
      if (!response.ok) {
        setState('error');
        setError(body.message ?? 'Message was not sent.');
        return;
      }
      form.reset();
      setState('idle');
      router.refresh();
    } catch {
      setState('error');
      setError('Network error. The message was not confirmed as sent.');
    }
  }

  return (
    <section className="thread-card" aria-labelledby="private-thread-title">
      <div className="thread-heading">
        <div>
          <span className="mini-label">Private 1:1 conversation</span>
          <h2 id="private-thread-title">Project messages</h2>
        </div>
        <span className="privacy-chip">Only you + owner</span>
      </div>

      <div className="thread-list" aria-live="polite">
        {messages.length ? messages.map((message) => {
          const mine = message.sender_role === viewerRole;
          return (
            <article className={`thread-message ${mine ? 'thread-message-mine' : 'thread-message-other'}`} key={message.id}>
              <div className="thread-meta">
                <strong>{mine ? 'You' : message.sender_role === 'owner' ? 'Owner' : 'Requester'}</strong>
                <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
              </div>
              <p>{message.body}</p>
            </article>
          );
        }) : <div className="empty-state">No messages yet. Use this private thread for project-specific communication.</div>}
      </div>

      <form className="thread-compose" onSubmit={submit}>
        <label htmlFor="message">Reply privately</label>
        <textarea id="message" name="message" minLength={1} maxLength={4000} rows={4} required placeholder="Write a clear project message…" />
        <div className="form-submit-row">
          <p className="privacy-note">Messages never appear in the public activity feed.</p>
          <button className="button button-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send private reply'}</button>
        </div>
        {error && <p className="form-message form-error" role="status">{error}</p>}
      </form>
    </section>
  );
}
