// Shared request-input validation helpers.
// The DB stores status/priority as plain strings (SQLite-era enums are
// commented out in prisma/schema.prisma), so nothing enforces these values
// at the database layer - it has to happen here.

export const VALID_STATUSES = [
  'IN_PROGRESS', 'APPLIED', 'INTERVIEW', 'OFFER',
  'LOOK_AGAIN', 'REJECTED', 'NOT_SUITABLE', 'EXPIRED_FILLED',
] as const

export const VALID_PRIORITIES = ['SUPER_HIGH', 'HIGH', 'MEDIUM', 'LOW'] as const

export function isValidStatus(v: string): boolean {
  return (VALID_STATUSES as readonly string[]).includes(v)
}

export function isValidPriority(v: string): boolean {
  return (VALID_PRIORITIES as readonly string[]).includes(v)
}

/** Parse a pagination query param, falling back to `fallback` for anything
 * that isn't a finite positive integer (missing, "abc", negative, etc). */
export function parsePositiveInt(raw: string | null, fallback: number, max?: number): number {
  const n = raw === null ? NaN : parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return max !== undefined ? Math.min(n, max) : n
}

/** Only allow http(s) URLs - blocks javascript:/data: etc being stored and
 * later rendered as an anchor href (stored-XSS-on-click). Empty/undefined
 * is allowed since these fields are optional. */
export function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
