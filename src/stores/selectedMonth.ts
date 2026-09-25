import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MonthKey } from '@/domain/models'

export const useSelectedMonthStore = defineStore('selectedMonth', () => {
  const selectedMonthKey = ref<MonthKey | null>(null)

  function setSelectedMonthKey(monthKey: MonthKey): void {
    selectedMonthKey.value = monthKey
  }

  function clearSelectedMonth(): void {
    selectedMonthKey.value = null
  }

  return { selectedMonthKey, setSelectedMonthKey, clearSelectedMonth }
})
