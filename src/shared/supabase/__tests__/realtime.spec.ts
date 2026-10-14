import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { subscribeToUserData } from '../realtime'

const invalidate = vi.hoisted(() => vi.fn<() => void>())
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
    interface TestChannel {
      on: (event: string, filter: unknown, callback: () => void) => TestChannel
      subscribe: (callback: (value: string) => void) => TestChannel
    }
    const channel: TestChannel = {
      on: vi.fn<TestChannel['on']>((_event, _filter, callback) => {
        change = callback
        return channel
      }),
      subscribe: vi.fn<TestChannel['subscribe']>((callback) => {
        status = callback
        return channel
      }),
    }
    const client = {
      channel: vi.fn<(name: string) => TestChannel>(() => channel),
      removeChannel: vi.fn<(value: TestChannel) => void>(),
    }
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
