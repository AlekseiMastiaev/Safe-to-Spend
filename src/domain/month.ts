import type { MonthKey } from './models'

/** Month keys use four-digit years 0001–9999 and two-digit calendar months. */
export function isValidMonthKey(value: unknown): value is MonthKey {
  return (
    typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && !value.startsWith('0000-')
  )
}

/** Validate an external month value before using it as a MonthKey. */
export function parseMonthKey(value: unknown): MonthKey | null {
  return isValidMonthKey(value) ? value : null
}

function formatMonthKey(year: number, month: number): MonthKey {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError('Год выходит за пределы формата YYYY-MM')
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

/** Use the device's local calendar, not the UTC date from toISOString(). */
export function getCurrentMonthKey(now: Date = new Date()): MonthKey {
  return formatMonthKey(now.getFullYear(), now.getMonth() + 1)
}

/** Return a local calendar date suitable for an `<input type="date">`. */
export function getCurrentIsoDate(now: Date = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function getPreviousMonthKey(monthKey: MonthKey): MonthKey {
  if (!isValidMonthKey(monthKey)) {
    throw new Error('Некорректный идентификатор месяца')
  }

  const year = Number(monthKey.slice(0, 4))
  const month = Number(monthKey.slice(5, 7))
  return month === 1 ? formatMonthKey(year - 1, 12) : formatMonthKey(year, month - 1)
}

export function getNextMonthKey(monthKey: MonthKey): MonthKey {
  if (!isValidMonthKey(monthKey)) {
    throw new Error('Некорректный идентификатор месяца')
  }

  const year = Number(monthKey.slice(0, 4))
  const month = Number(monthKey.slice(5, 7))
  return month === 12 ? formatMonthKey(year + 1, 1) : formatMonthKey(year, month + 1)
}
