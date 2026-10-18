import type { SiteSettings } from '@/lib/domain/settings';

export function RequestRules({ settings }: { settings: SiteSettings }) {
  return (
    <aside className="rules-card" aria-labelledby="request-rules-title">
      <span className="mini-label">Before you submit</span>
      <h2 id="request-rules-title">One clear request. Fixed scope.</h2>
      <p className="warning-copy">
        <strong>Please double-check your request before sending.</strong> For spam protection, you can submit one request every {settings.cooldownMinutes} minutes. Make sure your description, references, and contact details are correct before submitting.
      </p>
      <ul className="rules-list">
        <li>Submission does not guarantee acceptance.</li>
        <li>{settings.perPersonDailyCap == null ? 'No daily cap is currently set.' : `Maximum ${settings.perPersonDailyCap} submission${settings.perPersonDailyCap === 1 ? '' : 's'} per person per day.`}</li>
        <li>Fixed scope only; unlimited revisions are not included.</li>
        <li>If accepted, the result may be publicly showcased with owner credit/link under the consent terms.</li>
        <li>Your contact details, full request, references, and conversation stay private.</li>
      </ul>
    </aside>
  );
}
