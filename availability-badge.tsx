import type { SiteSettings } from '@/lib/domain/settings';

function reopenLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function AvailabilityBadge({ settings }: { settings: SiteSettings }) {
  const reopen = reopenLabel(settings.reopensAt);

  if (!settings.requestsOpen) {
    return (
      <div className="availability-pill availability-closed" role="status">
        <span className="status-dot status-dot-closed" />
        <span>{reopen ? `Requests closed · reopens ${reopen}` : 'Requests closed'}</span>
      </div>
    );
  }

  const label = settings.spotsAvailable === 1 ? '1 free spot available' : `${settings.spotsAvailable} free spots available`;
  return (
    <div className="availability-pill" role="status">
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
