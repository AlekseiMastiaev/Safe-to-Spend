<script setup lang="ts">
import { computed } from 'vue'
import BudgetSummary from '@/components/dashboard/BudgetSummary.vue'
import { createObligationPreview } from '@/components/obligations/preview'
import { useDataQuery } from '@/composables/useDataQuery'
import { calculateBudgetSummary } from '@/domain/calculations'
import {
  freeExpenseRepository,
  incomeRepository,
  monthRepository,
  obligationRepository,
  paymentRepository,
} from '@/shared/persistence'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const selectedMonth = useSelectedMonthStore()

const data = useDataQuery(async () => {
  const monthKey = selectedMonth.selectedMonthKey
  if (monthKey === null) throw new Error('Бюджетный месяц не выбран')
  const month = await monthRepository.findByMonthKey(monthKey)
  if (!month) throw new Error('Выбранный месяц не найден')
  const [incomes, obligations, payments, freeExpenses] = await Promise.all([
    incomeRepository.listByMonth(month.id),
    obligationRepository.listByMonth(month.id),
    paymentRepository.listByMonth(month.id),
    freeExpenseRepository.listByMonth(month.id),
  ])
  return { month, incomes, obligations, payments, freeExpenses }
})

const summary = computed(() => {
  if (data.value.status !== 'ready') return null
  return calculateBudgetSummary(data.value.data)
})

const paymentPreviews = computed(() => {
  if (data.value.status !== 'ready') return []
  const payments = data.value.data.payments
  return data.value.data.obligations.map((obligation) => {
    const preview = createObligationPreview(obligation, payments)
    return {
      id: obligation.id,
      title: obligation.title,
      plannedAmount: obligation.plannedAmount,
      actualPaid: preview.actualPaid,
      remainingReserve: preview.remainingReserve,
      isSettled: obligation.isSettled,
    }
  })
})
</script>

<template>
  <section class="page-stack" aria-labelledby="dashboard-title">
    <div class="page-heading">
      <h2 id="dashboard-title">Главная</h2>
      <p v-if="data.status === 'ready'">Бюджет за {{ data.data.month.monthKey }}</p>
    </div>

    <p v-if="data.status === 'loading'" role="status">Считаем бюджет…</p>
    <p v-else-if="data.status === 'error'" class="form-error" role="alert">
      Не удалось загрузить бюджет.
    </p>
    <BudgetSummary v-else-if="summary" :summary="summary" :payment-previews="paymentPreviews" />
  </section>
</template>
