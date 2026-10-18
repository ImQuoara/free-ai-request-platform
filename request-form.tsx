'use client';

import Script from 'next/script';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { SiteSettings } from '@/lib/domain/settings';
import { REQUEST_TURNSTILE_ACTION, type TurnstileBrowserApi } from '@/lib/security/turnstile-config';

function turnstileApi(): TurnstileBrowserApi | undefined {
  return (window as Window & { turnstile?: TurnstileBrowserApi }).turnstile;
}

function getSessionId() {
  const key = 'free-ai-request-session';
  let value = window.sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID().replaceAll('-', '');
    window.sessionStorage.setItem(key, value);
  }
  return value;
}

export function RequestForm({ settings, email, turnstileSiteKey }: { settings: SiteSettings; email: string; turnstileSiteKey: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const canSubmit = state !== 'sending' && cooldown <= 0 && Boolean(turnstileSiteKey) && turnstileVerified;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);


  useEffect(() => () => {
    const widgetId = turnstileWidgetIdRef.current;
    const api = turnstileApi();
    if (widgetId && api) {
      api.remove(widgetId);
      turnstileWidgetIdRef.current = null;
    }
  }, []);

  function renderTurnstile() {
    const api = turnstileApi();
    if (!turnstileSiteKey || !turnstileContainerRef.current || !api || turnstileWidgetIdRef.current) return;
    turnstileWidgetIdRef.current = api.render(turnstileContainerRef.current, {
      sitekey: turnstileSiteKey,
      theme: 'dark',
      action: REQUEST_TURNSTILE_ACTION,
      callback: () => setTurnstileVerified(true),
      'expired-callback': () => setTurnstileVerified(false),
      'timeout-callback': () => setTurnstileVerified(false),
      'error-callback': () => {
        setTurnstileVerified(false);
        setState('error');
        setMessage('Human verification could not load. Please try again.');
        return true;
      },
    }) ?? null;
  }

  function resetTurnstile() {
    setTurnstileVerified(false);
    const widgetId = turnstileWidgetIdRef.current;
    const api = turnstileApi();
    if (widgetId && api) api.reset(widgetId);
  }

  const cooldownText = useMemo(() => {
    if (cooldown <= 0) return null;
    const minutes = Math.floor(cooldown / 60);
    const seconds = cooldown % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState('sending');
    setMessage('');
    setPublicId(null);

    const form = new FormData(formElement);
    const references = String(form.get('referenceLinks') ?? '')
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    const params = new URLSearchParams(window.location.search);
    const turnstileToken = String(form.get('cf-turnstile-response') ?? '');

    const payload = {
      name: String(form.get('name') ?? ''),
      discord: String(form.get('discord') ?? ''),
      type: String(form.get('type') ?? ''),
      description: String(form.get('description') ?? ''),
      referenceLinks: references,
      consents: {
        review: form.get('consentReview') === 'on',
        rights: form.get('consentRights') === 'on',
        scope: form.get('consentScope') === 'on',
        showcase: form.get('consentShowcase') === 'on',
        credit: form.get('consentCredit') === 'on',
      },
      turnstileToken,
      honeypot: String(form.get('website') ?? ''),
      sessionId: getSessionId(),
      source: {
        utmSource: params.get('utm_source') ?? '',
        utmCampaign: params.get('utm_campaign') ?? '',
        referrer: document.referrer,
      },
    };

    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (response.status === 429 && body.code === 'COOLDOWN') {
        setCooldown(Number(body.retryAfterSeconds) || 1);
        setState('error');
        setMessage(`You’ve already submitted a request recently. You can submit another request in ${body.retryAfterSeconds} seconds.`);
        return;
      }
      if (response.status === 429 && body.code === 'DAILY_CAP') {
        setState('error');
        setMessage(`You reached today’s request limit. Next eligible time: ${new Date(body.nextEligibleAt).toLocaleString()}.`);
        return;
      }
      if (!response.ok) {
        setState('error');
        setMessage(body.message ?? 'Request could not be submitted. Please review the form and try again.');
        return;
      }

      setState('success');
      setPublicId(body.publicId ?? null);
      setMessage('Request received. You can follow its status in your private portal.');
      formElement.reset();
      if (body.nextEligibleAt) {
        const seconds = Math.max(0, Math.ceil((new Date(body.nextEligibleAt).getTime() - Date.now()) / 1000));
        setCooldown(seconds);
      }
    } catch {
      setState('error');
      setMessage('Network error. Your request was not confirmed as submitted. Please try again.');
    } finally {
      // Turnstile tokens are single-use once Siteverify sees them. Always obtain a fresh token for another attempt.
      resetTurnstile();
    }
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} />
      <form className="request-form" onSubmit={submit} noValidate>
        <div className="form-grid two-col">
          <label>Name or display name<input name="name" required maxLength={120} autoComplete="name" /></label>
          <label>Verified email<input value={email} disabled aria-readonly="true" /></label>
        </div>
        <div className="form-grid two-col">
          <label>Optional Discord<input name="discord" maxLength={120} placeholder="username" /></label>
          <label>What do you want?
            <select name="type" required defaultValue="Song">
              <option>Song</option><option>Landing Page</option><option>Other</option>
            </select>
          </label>
        </div>
        <label>Short description<textarea name="description" required minLength={10} maxLength={5000} rows={8} placeholder="Tell me exactly what you want, the intended audience, and what a successful result should feel like." /></label>
        <label>Reference links <span className="label-note">HTTPS only · one per line · maximum 5</span><textarea name="referenceLinks" rows={4} placeholder="https://…" /></label>
        <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

        <fieldset className="consent-fieldset">
          <legend>Required confirmations</legend>
          <label className="check-row"><input type="checkbox" name="consentReview" required /> I reviewed my request and contact details before sending.</label>
          <label className="check-row"><input type="checkbox" name="consentRights" required /> I own or have permission to use the references I supplied.</label>
          <label className="check-row"><input type="checkbox" name="consentScope" required /> I understand the request is fixed scope and does not include unlimited revisions.</label>
          <label className="check-row"><input type="checkbox" name="consentShowcase" required /> If accepted, I allow the finished result to be considered for public showcase.</label>
          <label className="check-row"><input type="checkbox" name="consentCredit" required /> I understand owner credit/link may appear with a public showcase.</label>
        </fieldset>

        {turnstileSiteKey ? (
          <div ref={turnstileContainerRef} id="request-turnstile" className="turnstile-container" aria-label="Human verification" />
        ) : (
          <div className="verification-unavailable">Human verification is not configured yet, so submissions are disabled.</div>
        )}

        {cooldownText && <p className="cooldown-banner" role="status">Request submitted ✓ · next submission available in {cooldownText}</p>}
        {message && <p className={state === 'success' ? 'form-message form-success' : 'form-message form-error'} role="status">{message}{publicId ? ` Reference: ${publicId}.` : ''}</p>}

        <div className="form-submit-row">
          <p className="privacy-note">Only you and the owner can access the full request and project conversation.</p>
          <button className="button button-primary" type="submit" disabled={!canSubmit}>{state === 'sending' ? 'Sending…' : cooldown > 0 ? `Available in ${cooldownText}` : !turnstileVerified ? 'Complete verification' : 'Submit request'}</button>
        </div>
      </form>
    </>
  );
}
