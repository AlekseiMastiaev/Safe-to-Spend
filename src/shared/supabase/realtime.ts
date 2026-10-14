import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { invalidateData } from '@/composables/useDataQuery'

export function subscribeToUserData(client: SupabaseClient, userId: string): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  const scheduleRefresh = () => {
    if (disposed || timer !== null) return
    timer = setTimeout(() => {
      timer = null
      if (!disposed) invalidateData()
    }, 50)
  }
  const channel: RealtimeChannel = client
    .channel(`safe-to-spend-user-data-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public' }, scheduleRefresh)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') scheduleRefresh()
    })

  return () => {
    disposed = true
    if (timer !== null) clearTimeout(timer)
    void client.removeChannel(channel)
  }
}
