import { liveQuery } from 'dexie'
import { onScopeDispose, shallowRef, type ShallowRef } from 'vue'

export type LiveQueryState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: unknown }

/** Subscribe inside a Vue setup scope and release the subscription with that scope. */
export function useDexieLiveQuery<T>(
  querier: () => T | Promise<T>,
): Readonly<ShallowRef<LiveQueryState<T>>> {
  const state = shallowRef<LiveQueryState<T>>({ status: 'loading' })
  const subscription = liveQuery(querier).subscribe({
    next(data) {
      state.value = { status: 'ready', data }
    },
    error(error: unknown) {
      state.value = { status: 'error', error }
    },
  })

  onScopeDispose(() => subscription.unsubscribe())

  return state
}
