const AUTH_DESTINATIONS = ['/request', '/portal', '/admin'] as const;
const SAFE_BASE_ORIGIN = 'https://auth.local';

export function safeAuthNextPath(value: string | null | undefined): string {
  if (!value || value.includes('\\')) return '/portal';

  try {
    const candidate = new URL(value, SAFE_BASE_ORIGIN);
    if (candidate.origin !== SAFE_BASE_ORIGIN) return '/portal';

    const allowed = AUTH_DESTINATIONS.some(
      (root) => candidate.pathname === root || candidate.pathname.startsWith(`${root}/`),
    );
    if (!allowed) return '/portal';

    return `${candidate.pathname}${candidate.search}`;
  } catch {
    return '/portal';
  }
}
