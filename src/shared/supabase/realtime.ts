import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { invalidateData } from '@/composables/useDataQuery'

export function subscribeToUserData(client: SupabaseClient): () => void {
  const channel: RealtimeChannel = client
    .channel('safe-to-spend-user-data')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => invalidateData())
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
