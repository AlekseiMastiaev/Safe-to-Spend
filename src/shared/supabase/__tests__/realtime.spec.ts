import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { subscribeToUserData } from '../realtime'

const invalidate = vi.hoisted(() => vi.fn())
vi.mock('@/composables/useDataQuery', () => ({ invalidateData: invalidate }))

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('realtime refresh', () => {
  it('coalesces change bursts, refreshes on reconnect and cancels after disposal', async () => {
    vi.useFakeTimers()
    let change!: () => void
    let status!: (value: string) => void
    const channel = {
      on: vi.fn((_event, _filter, callback) => {
        change = callback
        return channel
      }),
      subscribe: vi.fn((callback) => {
        status = callback
        return channel
      }),
    }
    const client = { channel: vi.fn(() => channel), removeChannel: vi.fn() }
    const stop = subscribeToUserData(client as unknown as SupabaseClient, 'user-a')
    change()
    change()
    status('SUBSCRIBED')
    await vi.advanceTimersByTimeAsync(50)
    expect(invalidate).toHaveBeenCalledTimes(1)
    status('SUBSCRIBED')
    await vi.advanceTimersByTimeAsync(50)
    expect(invalidate).toHaveBeenCalledTimes(2)
    change()
    stop()
    change()
    await vi.advanceTimersByTimeAsync(50)
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(client.removeChannel).toHaveBeenCalledWith(channel)
  })
})
