import "server-only";

export const SAVED_QR_MUTATION_RATE_LIMIT = 30;
export const SAVED_QR_MUTATION_RATE_WINDOW_SECONDS = 60;
export const SAVED_QR_RATE_LIMIT_ERROR = "saved_qr_rate_limited";

const MAX_TRACKED_ACCOUNTS = 10_000;
const WINDOW_MS = SAVED_QR_MUTATION_RATE_WINDOW_SECONDS * 1_000;

type Entry = { count: number; startedAt: number };
const entries = new Map<string, Entry>();

function prune(now: number) {
  for (const [key, entry] of entries) {
    if (now - entry.startedAt >= WINDOW_MS) entries.delete(key);
  }
  while (entries.size >= MAX_TRACKED_ACCOUNTS) {
    const oldest = entries.keys().next().value;
    if (typeof oldest !== "string") break;
    entries.delete(oldest);
  }
}

/**
 * A bounded process-local guard keyed only by the authenticated Better Auth
 * user ID. It stores no IP address. Multi-process deployments must replace
 * this with an atomic shared limiter before relying on it as a global limit.
 */
export function consumeSavedQrMutation(
  userId: string,
  now = Date.now(),
): { allowed: true } | { allowed: false; retryAfter: number } {
  prune(now);
  const current = entries.get(userId);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    entries.set(userId, { count: 1, startedAt: now });
    return { allowed: true };
  }
  if (current.count >= SAVED_QR_MUTATION_RATE_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.startedAt + WINDOW_MS - now) / 1_000)),
    };
  }
  current.count += 1;
  return { allowed: true };
}

/** Test seam; production code never resets the limiter. */
export function resetSavedQrMutationRateLimitForTests() {
  entries.clear();
}
