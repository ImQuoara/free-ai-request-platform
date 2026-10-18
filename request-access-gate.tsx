'use client';

import Script from 'next/script';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { buildPasswordlessOtpOptions } from '@/lib/auth/otp';
import { AUTH_TURNSTILE_ACTION, type TurnstileBrowserApi } from '@/lib/security/turnstile-config';
import { createClient } from '@/lib/supabase/client';

function turnstileApi(): TurnstileBrowserApi | undefined {
  return (window as Window & { turnstile?: TurnstileBrowserApi }).turnstile;
}

export function RequestAccessGate({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => () => {
    const api = turnstileApi();
    if (widgetIdRef.current && api) api.remove(widgetIdRef.current);
  }, []);

  function renderTurnstile() {
    const api = turnstileApi();
    if (!api || !containerRef.current || !turnstileSiteKey || widgetIdRef.current) return;
    widgetIdRef.current = api.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      theme: 'dark',
      action: AUTH_TURNSTILE_ACTION,
      callback: (token) => {
        setCaptchaToken(token);
        if (state === 'error') {
          setState('idle');
          setMessage('');
        }
      },
      'expired-callback': () => setCaptchaToken(''),
      'timeout-callback': () => setCaptchaToken(''),
      'error-callback': () => {
        setCaptchaToken('');
        setState('error');
        setMessage('Human verification could not load. Please try again.');
        return true;
      },
    }) ?? null;
  }

  function resetTurnstile() {
    setCaptchaToken('');
    const api = turnstileApi();
    if (widgetIdRef.current && api) api.reset(widgetIdRef.current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captchaToken) {
      setState('error');
      setMessage('Complete human verification before requesting a secure link.');
      return;
    }

    setState('sending');
    setMessage('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: buildPasswordlessOtpOptions(window.location.origin, captchaToken),
      });
      if (error) throw error;
      setState('sent');
      setMessage('Check your email for the secure sign-in link.');
    } catch {
      setState('error');
      setMessage('Email verification could not be started. Please try again.');
    } finally {
      resetTurnstile();
    }
  }

  const canSend = state !== 'sending' && Boolean(email.trim()) && Boolean(turnstileSiteKey) && Boolean(captchaToken);

  return (
    <div className="access-card">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} />
      <span className="mini-label">Private request access</span>
      <h1>Verify your email before requesting.</h1>
      <p className="hero-copy">Your verified email becomes the identity boundary for your private request and project conversation. Submission does not guarantee acceptance.</p>
      <form className="access-form" onSubmit={submit}>
        <label htmlFor="request-email">Email address</label>
        <div className="inline-form">
          <input id="request-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          <button className="button button-primary" type="submit" disabled={!canSend}>
            {state === 'sending' ? 'Sending…' : captchaToken ? 'Send secure link' : 'Complete verification'}
          </button>
        </div>
        {turnstileSiteKey ? (
          <div ref={containerRef} id="auth-turnstile" className="turnstile-container" aria-label="Human verification" />
        ) : (
          <div className="verification-unavailable">Human verification is not configured yet, so secure-link requests are disabled.</div>
        )}
      </form>
      {message && <p className={state === 'error' ? 'form-message form-error' : 'form-message form-success'} role="status">{message}</p>}
      <p className="privacy-note">No password required. Other requesters cannot see your email, request, or conversation.</p>
    </div>
  );
}
