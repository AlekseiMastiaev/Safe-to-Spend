import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { useSelectedMonthStore } from '../selectedMonth'

describe('selected month route synchronization', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.push('/')
    await router.isReady()
  })

  it('reads a valid month from a direct history URL', async () => {
    await router.push('/history/2026-10')

    expect(router.currentRoute.value.path).toBe('/history/2026-10')
    expect(useSelectedMonthStore().selectedMonthKey).toBe('2026-10')
  })

  it('updates the store when only the route parameter changes', async () => {
    await router.push('/history/2026-10')
    await router.push('/history/2026-11')

    expect(useSelectedMonthStore().selectedMonthKey).toBe('2026-11')
  })

  it.each(['банан', '2026-00', '2026-13'])('redirects invalid month %s', async (value) => {
    await router.push(`/history/${value}`)

    expect(router.currentRoute.value.path).toBe('/history')
    expect(useSelectedMonthStore().selectedMonthKey).toBeNull()
  })
})
