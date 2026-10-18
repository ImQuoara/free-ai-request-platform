export function normalizeAttribution(value: string | null | undefined, maxLength: number) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

export function safeAnalyticsPath(path: string) {
  return path === '/' || path === '/request' || /^\/work\/R[A-F0-9]{8}$/.test(path);
}

export type AnalyticsSummary = {
  visitsToday: number;
  visits7d: number;
  totalPageViews: number;
  uniqueishSessions: number;
  submissions: number;
  acceptedRequests: number;
  conversionRate: number;
  sourceBreakdown: Array<{ label: string; count: number }>;
  campaignBreakdown: Array<{ label: string; count: number }>;
  topWorkItems: Array<{ label: string; count: number }>;
};

export function emptyAnalyticsSummary(): AnalyticsSummary {
  return {
    visitsToday: 0,
    visits7d: 0,
    totalPageViews: 0,
    uniqueishSessions: 0,
    submissions: 0,
    acceptedRequests: 0,
    conversionRate: 0,
    sourceBreakdown: [],
    campaignBreakdown: [],
    topWorkItems: [],
  };
}
