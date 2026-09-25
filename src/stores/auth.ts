import type { Session } from '@supabase/supabase-js'
import { computed, ref } from 'vue'
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

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isCloud = computed(() => persistenceMode === 'cloud')

  function applySession(session: Session | null): void {
    stopRealtime?.()
    stopRealtime = null
    userId.value = session?.user.id ?? null
    userEmail.value = session?.user.email ?? null
    status.value = session ? 'authenticated' : 'anonymous'
    if (session) stopRealtime = subscribeToUserData(getCloudClient())
    invalidateData()
  }

  async function initialize(): Promise<void> {
    if (initialized) return
    initialized = true
    error.value = null

    if (persistenceMode === 'local') {
      status.value = 'authenticated'
      return
    }

    status.value = 'loading'
    const client = getCloudClient()
    const { data, error: sessionError } = await client.auth.getSession()
    if (sessionError) {
      error.value = sessionError.message
      status.value = 'error'
      return
    }
    applySession(data.session)
    client.auth.onAuthStateChange((_event, session) => applySession(session))
  }

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
    signOut,
  }
})
