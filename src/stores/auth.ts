import type { Session } from '@supabase/supabase-js'
import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'
import { invalidateData } from '@/composables/useDataQuery'
import { getCloudClient, persistenceMode } from '@/shared/persistence'
import { subscribeToUserData } from '@/shared/supabase/realtime'

type AuthStatus = 'idle' | 'loading' | 'anonymous' | 'authenticated' | 'error'

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('idle')
  const userId = ref<string | null>(null)
  const userEmail = ref<string | null>(null)
  const error = ref<string | null>(null)
  let initialized = false
  let stopRealtime: (() => void) | null = null
  let stopAuth: (() => void) | null = null
  let initialization: Promise<void> | null = null
  let realtimeTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isCloud = computed(() => persistenceMode === 'cloud')

  function applySession(session: Session | null): void {
    if (disposed) return
    const nextUserId = session?.user.id ?? null
    const nextStatus = session ? 'authenticated' : 'anonymous'
    const changed = userId.value !== nextUserId || status.value !== nextStatus
    userId.value = nextUserId
    userEmail.value = session?.user.email ?? null
    status.value = nextStatus
    error.value = null
    if (!changed) return

    // Keep Supabase operations outside its synchronous auth callback.
    if (realtimeTimer !== null) clearTimeout(realtimeTimer)
    realtimeTimer = setTimeout(() => {
      realtimeTimer = null
      stopRealtime?.()
      stopRealtime = userId.value ? subscribeToUserData(getCloudClient(), userId.value) : null
    }, 0)
    invalidateData()
  }

  async function initialize(): Promise<void> {
    if (initialized) return
    if (initialization) return initialization
    error.value = null

    if (persistenceMode === 'local') {
      status.value = 'authenticated'
      initialized = true
      return
    }

    status.value = 'loading'
    initialization = (async () => {
      try {
        const client = getCloudClient()
        const { data, error: sessionError } = await client.auth.getSession()
        if (disposed) return
        if (sessionError) throw sessionError
        applySession(data.session)
        const { data: listener } = client.auth.onAuthStateChange((_event, session) =>
          applySession(session),
        )
        stopAuth = () => listener.subscription.unsubscribe()
        initialized = true
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : 'Не удалось проверить сессию'
        status.value = 'error'
      } finally {
        initialization = null
      }
    })()
    return initialization
  }

  onScopeDispose(() => {
    disposed = true
    if (realtimeTimer !== null) clearTimeout(realtimeTimer)
    stopRealtime?.()
    stopAuth?.()
  })

  async function sendMagicLink(email: string): Promise<void> {
    error.value = null
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error: signInError } = await getCloudClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (signInError) {
      error.value = signInError.message
      throw signInError
    }
  }

  async function signInWithGitHub(): Promise<void> {
    error.value = null
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { error: signInError } = await getCloudClient().auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    })
    if (signInError) {
      error.value = signInError.message
      throw signInError
    }
  }

  async function signOut(): Promise<void> {
    error.value = null
    const { error: signOutError } = await getCloudClient().auth.signOut()
    if (signOutError) {
      error.value = signOutError.message
      throw signOutError
    }
  }

  return {
    status,
    userId,
    userEmail,
    error,
    isAuthenticated,
    isCloud,
    initialize,
    sendMagicLink,
    signInWithGitHub,
    signOut,
  }
})
