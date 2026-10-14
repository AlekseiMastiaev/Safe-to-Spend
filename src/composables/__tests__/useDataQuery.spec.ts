import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { invalidateData, useDataQuery } from '../useDataQuery'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()))

function runQuery<T>(query: () => Promise<T> | T, key = ref<string | null>('user:month')) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useDataQuery(query, undefined, () => key.value))!
}

describe('useDataQuery', () => {
  it('keeps loaded data during refresh and a failed refresh, then retries', async () => {
    let resolve!: (value: number) => void
    const query = vi
      .fn<() => Promise<number>>()
      .mockResolvedValueOnce(10)
      .mockImplementationOnce(
        () =>
          new Promise<number>((done) => {
            resolve = done
          }),
      )
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(30)
    const state = runQuery<number>(query)
    await flushPromises()
    invalidateData()
    await flushPromises()
    expect(state.value).toMatchObject({ status: 'ready', data: 10, refreshing: true })
    resolve(20)
    await flushPromises()
    invalidateData()
    await flushPromises()
    expect(state.value).toMatchObject({ status: 'ready', data: 20, refreshing: false })
    expect(state.value.status === 'ready' && state.value.refreshError).toBeInstanceOf(Error)
    invalidateData()
    await flushPromises()
    expect(state.value).toMatchObject({ status: 'ready', data: 30, refreshError: null })
  })

  it('clears another month or user and ignores an older response', async () => {
    let resolveOld!: (value: string) => void
    const key = ref<string | null>('a:september')
    const query = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('september')
      .mockImplementationOnce(
        () =>
          new Promise<string>((done) => {
            resolveOld = done
          }),
      )
      .mockResolvedValueOnce('october')
    const state = runQuery<string>(query, key)
    await flushPromises()
    invalidateData()
    await flushPromises()
    key.value = 'b:october'
    await nextTick()
    expect(state.value).toEqual({ status: 'loading' })
    await flushPromises()
    resolveOld('stale september')
    await flushPromises()
    expect(state.value).toMatchObject({ status: 'ready', data: 'october' })
  })

  it('coalesces invalidations and handles synchronous errors', async () => {
    const query = vi.fn<() => number>(() => 10)
    runQuery(query)
    await flushPromises()
    invalidateData()
    invalidateData()
    invalidateData()
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    const failed = runQuery(() => {
      throw new Error('unavailable')
    })
    await flushPromises()
    expect(failed.value.status).toBe('error')
  })

  it('clears disabled queries and ignores responses after disposal', async () => {
    const enabled = ref(true)
    let resolve!: (value: number) => void
    const scope = effectScope()
    scopes.push(scope)
    const state = scope.run(() =>
      useDataQuery(
        () =>
          new Promise<number>((done) => {
            resolve = done
          }),
        () => enabled.value,
      ),
    )!
    await flushPromises()
    enabled.value = false
    await nextTick()
    scope.stop()
    resolve(100)
    await flushPromises()
    expect(state.value).toEqual({ status: 'idle' })
  })
})
