/**
 * Parse date strings consistently so the visual timeline and axis stay in sync.
 * ISO date-only (YYYY-MM-DD) is parsed as local noon to avoid timezone shift.
 */
export function parseDateLocal(value: string | number | Date): Date {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  const s = String(value).trim()
  if (!s) return new Date(NaN)
  // ISO date-only: treat as local noon so display doesn't shift by timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0, 0)
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date(NaN) : d
}

/** Format date as YYYY-MM-DD in local time (for consistent sync with parseDateLocal). */
export function formatDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
