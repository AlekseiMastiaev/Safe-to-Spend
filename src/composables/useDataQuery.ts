import { onScopeDispose, ref, shallowRef, watch, type ShallowRef } from 'vue'

export type DataQueryState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T; refreshing: boolean; refreshError: unknown | null }
  | { status: 'error'; error: unknown }

const invalidationVersion = ref(0)
let invalidationQueued = false

/** Notify every active query after a local mutation or a remote realtime event. */
export function invalidateData(): void {
  if (invalidationQueued) return
  invalidationQueued = true
  queueMicrotask(() => {
    invalidationQueued = false
    invalidationVersion.value += 1
  })
}

export function useDataQuery<T>(
  query: () => T | Promise<T>,
  enabled: () => boolean = () => true,
  key: () => string | null = () => null,
): Readonly<ShallowRef<DataQueryState<T>>> {
  const state = shallowRef<DataQueryState<T>>({ status: 'idle' })
  let requestId = 0
  let disposed = false
  let previousKey: string | null | undefined

  watch(
    [() => invalidationVersion.value, enabled, key],
    ([, isEnabled, queryKey]) => {
      const currentRequest = ++requestId
      const previous = previousKey === queryKey ? state.value : null
      previousKey = queryKey

      if (!isEnabled) {
        state.value = { status: 'idle' }
        return
      }

      state.value =
        previous?.status === 'ready'
          ? { ...previous, refreshing: true, refreshError: null }
          : { status: 'loading' }
      Promise.resolve()
        .then(query)
        .then(
          (data) => {
            if (!disposed && currentRequest === requestId) {
              state.value = { status: 'ready', data, refreshing: false, refreshError: null }
            }
          },
          (error: unknown) => {
            if (disposed || currentRequest !== requestId) return
            state.value =
              previous?.status === 'ready'
                ? { ...previous, refreshing: false, refreshError: error }
                : { status: 'error', error }
          },
        )
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    disposed = true
    requestId += 1
  })

  return state
}
