export type SiteSettings = {
  requestsOpen: boolean;
  spotsAvailable: number;
  reopensAt: string | null;
  cooldownMinutes: number;
  perPersonDailyCap: number | null;
  autoDecrementOnAccept: boolean;
  publicActivityEnabled: boolean;
};

type SiteSettingsRow = {
  id?: string;
  requests_open?: boolean | null;
  spots_available?: number | null;
  reopens_at?: string | null;
  cooldown_minutes?: number | null;
  per_person_daily_cap?: number | null;
  auto_decrement_on_accept?: boolean | null;
  public_activity_enabled?: boolean | null;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = Object.freeze({
  requestsOpen: false,
  spotsAvailable: 0,
  reopensAt: null,
  cooldownMinutes: 10,
  perPersonDailyCap: 3,
  autoDecrementOnAccept: true,
  publicActivityEnabled: true,
});

function safeInt(value: number | null | undefined, fallback: number, min: number, max: number) {
  return Number.isInteger(value) && value! >= min && value! <= max ? value! : fallback;
}

export function normalizeSiteSettings(row: SiteSettingsRow | null | undefined): SiteSettings {
  return {
    requestsOpen: row?.requests_open ?? DEFAULT_SITE_SETTINGS.requestsOpen,
    spotsAvailable: safeInt(row?.spots_available, DEFAULT_SITE_SETTINGS.spotsAvailable, 0, 100_000),
    reopensAt: row?.reopens_at ?? null,
    cooldownMinutes: safeInt(row?.cooldown_minutes, DEFAULT_SITE_SETTINGS.cooldownMinutes, 0, 1440),
    perPersonDailyCap:
      row?.per_person_daily_cap === null
        ? null
        : safeInt(row?.per_person_daily_cap, DEFAULT_SITE_SETTINGS.perPersonDailyCap ?? 3, 1, 100),
    autoDecrementOnAccept:
      row?.auto_decrement_on_accept ?? DEFAULT_SITE_SETTINGS.autoDecrementOnAccept,
    publicActivityEnabled:
      row?.public_activity_enabled ?? DEFAULT_SITE_SETTINGS.publicActivityEnabled,
  };
}
