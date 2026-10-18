type GuardError = { message?: string | null; details?: string | null };

function nextUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function mapGuardRpcError(error: GuardError, now = new Date()) {
  const message = error.message ?? '';
  if (message.includes('cooldown_active')) {
    let retryAfterSeconds = 1;
    try {
      const detail = JSON.parse(error.details ?? '{}') as { remaining_seconds?: number };
      retryAfterSeconds = Math.max(1, Number(detail.remaining_seconds) || 1);
    } catch {
      retryAfterSeconds = 1;
    }
    return { status: 429, body: { code: 'COOLDOWN' as const, retryAfterSeconds } };
  }
  if (message.includes('daily_cap_reached')) {
    return {
      status: 429,
      body: { code: 'DAILY_CAP' as const, nextEligibleAt: nextUtcDay(now).toISOString() },
    };
  }
  if (message.includes('requests_closed')) {
    return { status: 409, body: { code: 'CLOSED' as const, message: 'Requests are currently closed.' } };
  }
  return { status: 500, body: { code: 'SUBMISSION_FAILED' as const, message: 'Request could not be submitted.' } };
}
