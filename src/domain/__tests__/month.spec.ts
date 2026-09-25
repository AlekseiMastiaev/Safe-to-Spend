// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCurrentMonthKey,
  getNextMonthKey,
  getPreviousMonthKey,
  isValidMonthKey,
  parseMonthKey,
} from '../month'

describe('parseMonthKey', () => {
  it.each(['2026-01', '2026-12', '0001-09'])('accepts a valid month key %s', (value) => {
    expect(parseMonthKey(value)).toBe(value)
  })

  it.each(['банан', '2026-1', '2026-00', '2026-13', '0000-01', '2026-10x', ' 2026-10'])(
    'rejects an invalid month key %s',
    (value) => {
      expect(parseMonthKey(value)).toBeNull()
    },
  )

  it.each([null, undefined, 202610, ['2026-10']])('rejects a non-string value %s', (value) => {
    expect(parseMonthKey(value)).toBeNull()
  })

  it('has a boolean validator for untrusted values', () => {
    expect(isValidMonthKey('2026-09')).toBe(true)
    expect(isValidMonthKey('0000-09')).toBe(false)
    expect(isValidMonthKey(202609)).toBe(false)
  })
})

describe('calendar month arithmetic', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('uses the local month when UTC is still in the previous month', () => {
    vi.stubEnv('TZ', 'Pacific/Kiritimati')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T11:30:00.000Z'))

    expect(new Date().toISOString().slice(0, 7)).toBe('2026-01')
    expect(getCurrentMonthKey()).toBe('2026-02')
  })

  it('uses the local year when UTC is already in the next year', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T03:00:00.000Z'))

    expect(new Date().toISOString().slice(0, 7)).toBe('2027-01')
    expect(getCurrentMonthKey()).toBe('2026-12')
  })

  it('accepts a supplied date and rejects dates outside the supported year range', () => {
    expect(getCurrentMonthKey(new Date(2026, 8, 18))).toBe('2026-09')
    expect(() => getCurrentMonthKey(new Date(Number.NaN))).toThrow(RangeError)
    expect(() => getCurrentMonthKey(new Date(10000, 0, 1))).toThrow(RangeError)
  })

  it.each([
    ['2026-09', '2026-08', '2026-10'],
    ['2026-01', '2025-12', '2026-02'],
    ['2026-12', '2026-11', '2027-01'],
    ['0001-02', '0001-01', '0001-03'],
  ])('moves between months around %s', (monthKey, previous, next) => {
    expect(getPreviousMonthKey(monthKey)).toBe(previous)
    expect(getNextMonthKey(monthKey)).toBe(next)
  })

  it('rejects invalid keys and year overflow instead of returning a malformed key', () => {
    expect(() => getNextMonthKey('2026-13')).toThrow('Некорректный идентификатор месяца')
    expect(() => getPreviousMonthKey('0001-01')).toThrow(RangeError)
    expect(() => getNextMonthKey('9999-12')).toThrow(RangeError)
  })
})
