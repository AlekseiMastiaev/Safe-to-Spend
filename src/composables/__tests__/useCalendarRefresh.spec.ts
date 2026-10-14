import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCalendarRefresh } from '../useCalendarRefresh'

const invalidate = vi.hoisted(() => vi.fn<() => void>())
vi.mock('../useDataQuery', () => ({ invalidateData: invalidate }))
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  invalidate.mockClear()
})

describe('calendar refresh', () => {
  it('checks the month at local midnight and on resume, then removes listeners and timers', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    let enabled = true
    const wrapper = mount({
      setup() {
        useCalendarRefresh(() => enabled)
        return () => null
      },
    })
    await vi.advanceTimersByTimeAsync(1025)
    expect(invalidate).toHaveBeenCalledTimes(1)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(invalidate).toHaveBeenCalledTimes(2)
    enabled = false
    window.dispatchEvent(new Event('pageshow'))
    expect(invalidate).toHaveBeenCalledTimes(2)
    wrapper.unmount()
    enabled = true
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(86_400_000)
    expect(invalidate).toHaveBeenCalledTimes(2)
  })
})
