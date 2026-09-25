import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSelectedMonthStore } from '../selectedMonth'

describe('useSelectedMonthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts without a selected month', () => {
    expect(useSelectedMonthStore().selectedMonthKey).toBeNull()
  })

  it('shares the selected month across consumers of the same Pinia instance', () => {
    const firstConsumer = useSelectedMonthStore()
    const secondConsumer = useSelectedMonthStore()

    firstConsumer.setSelectedMonthKey('2026-10')

    expect(secondConsumer.selectedMonthKey).toBe('2026-10')
  })

  it('clears the selection', () => {
    const store = useSelectedMonthStore()
    store.setSelectedMonthKey('2026-10')

    store.clearSelectedMonth()

    expect(store.selectedMonthKey).toBeNull()
  })
})
