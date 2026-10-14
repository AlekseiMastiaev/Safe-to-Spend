import type { Session } from '@supabase/supabase-js'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../auth'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<{ data: { session: Session | null }; error: unknown }>>(),
  onAuthStateChange: vi.fn<
    (callback: (event: string, value: Session | null) => void) => {
      data: { subscription: { unsubscribe: () => void } }
    }
  >(),
  subscribe: vi.fn<(client: unknown, userId: string) => () => void>(),
  stop: vi.fn<() => void>(),
  unsubscribe: vi.fn<() => void>(),
  invalidate: vi.fn<() => void>(),
}))
vi.mock('@/shared/persistence', () => ({
  persistenceMode: 'cloud',
  getCloudClient: () => ({ auth: mocks }),
}))
vi.mock('@/shared/supabase/realtime', () => ({ subscribeToUserData: mocks.subscribe }))
vi.mock('@/composables/useDataQuery', () => ({ invalidateData: mocks.invalidate }))

function session(id: string): Session {
  return { user: { id, email: `${id}@example.com` }, access_token: id } as Session
}

describe('auth session lifecycle', () => {
  let store: ReturnType<typeof useAuthStore>
  let notify: (event: string, value: Session | null) => void
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    setActivePinia(createPinia())
    mocks.getSession.mockResolvedValue({ data: { session: session('a') }, error: null })
    mocks.onAuthStateChange.mockImplementation((callback) => {
      notify = callback
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
    })
    mocks.subscribe.mockReturnValue(mocks.stop)
    store = useAuthStore()
  })
  afterEach(() => {
    store.$dispose()
    vi.useRealTimers()
  })

  it('keeps one subscription on repeated sign-in and token refresh', async () => {
    await Promise.all([store.initialize(), store.initialize()])
    await vi.advanceTimersByTimeAsync(0)
    notify('SIGNED_IN', session('a'))
    notify('TOKEN_REFRESHED', { ...session('a'), access_token: 'new-token' })
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(mocks.subscribe).toHaveBeenCalledTimes(1)
    expect(mocks.stop).not.toHaveBeenCalled()
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
    notify('SIGNED_IN', session('b'))
    await vi.advanceTimersByTimeAsync(0)
    expect(store.userId).toBe('b')
    expect(mocks.stop).toHaveBeenCalledTimes(1)
    expect(mocks.subscribe).toHaveBeenCalledTimes(2)
    notify('SIGNED_OUT', null)
    await vi.advanceTimersByTimeAsync(0)
    expect(store.isAuthenticated).toBe(false)
    expect(mocks.stop).toHaveBeenCalledTimes(2)
  })

  it('allows initialization to retry after a session read error', async () => {
    mocks.getSession.mockRejectedValueOnce(new Error('offline'))
    await store.initialize()
    expect(store.status).toBe('error')
    await store.initialize()
    expect(store.status).toBe('authenticated')
    expect(mocks.getSession).toHaveBeenCalledTimes(2)
  })
})
