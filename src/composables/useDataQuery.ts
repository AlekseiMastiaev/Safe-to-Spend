import { onScopeDispose, ref, shallowRef, watchEffect, type ShallowRef } from 'vue'

export type DataQueryState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: unknown }

const invalidationVersion = ref(0)

/** Notify every active query after a local mutation or a remote realtime event. */
export function invalidateData(): void {
  invalidationVersion.value += 1
}

export function useDataQuery<T>(
  query: () => T | Promise<T>,
  enabled: () => boolean = () => true,
): Readonly<ShallowRef<DataQueryState<T>>> {
  const state = shallowRef<DataQueryState<T>>({ status: 'idle' })
  let requestId = 0
  let disposed = false

  watchEffect(() => {
    void invalidationVersion.value
    const currentRequest = ++requestId

    if (!enabled()) {
      state.value = { status: 'idle' }
      return
    }

    state.value = { status: 'loading' }
    Promise.resolve(query()).then(
      (data) => {
        if (!disposed && currentRequest === requestId) state.value = { status: 'ready', data }
      },
      (error: unknown) => {
        if (!disposed && currentRequest === requestId) state.value = { status: 'error', error }
      },
    )
  })

  onScopeDispose(() => {
    disposed = true
    requestId += 1
  })

  return state
}
