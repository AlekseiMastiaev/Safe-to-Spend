<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/domain/money'
import type { BudgetSummary as BudgetSummaryModel } from '@/domain/models'
import BudgetMetric from './BudgetMetric.vue'
import PrimaryBalanceCard from './PrimaryBalanceCard.vue'

const props = defineProps<{
  summary: BudgetSummaryModel
}>()

const balanceState = computed(() => {
  if (props.summary.safeToSpend > 0) return 'positive'
  if (props.summary.safeToSpend < 0) return 'negative'
  return 'zero'
})

const metrics = computed(() => [
  {
    label: 'Получено доходов',
    amount: formatMoney(props.summary.receivedIncome),
    detail: `Из запланированных ${formatMoney(props.summary.plannedIncome)}`,
  },
  {
    label: 'Фактический баланс',
    amount: formatMoney(props.summary.actualBalance),
    detail: 'До вычета оставшегося резерва',
  },
  {
    label: 'Оставшийся резерв',
    amount: formatMoney(props.summary.remainingReserve),
    detail: 'Для открытых обязательных расходов',
  },
  {
    label: 'Свободные расходы',
    amount: formatMoney(props.summary.freeExpensesTotal),
    detail: 'Уже совершённые траты',
  },
  {
    label: 'Экономия',
    amount: formatMoney(props.summary.settledSavingsTotal),
    detail: 'Только по закрытым расходам',
  },
  {
    label: 'Перерасход',
    amount: formatMoney(props.summary.overspendTotal),
    detail: 'Сверх запланированных сумм',
  },
])
</script>

<template>
  <section class="budget-summary" aria-label="Сводка бюджета">
    <PrimaryBalanceCard :amount="formatMoney(summary.safeToSpend)" :state="balanceState" />
    <div class="budget-summary__metrics">
      <BudgetMetric
        v-for="metric in metrics"
        :key="metric.label"
        :label="metric.label"
        :amount="metric.amount"
        :detail="metric.detail"
      />
    </div>
  </section>
</template>

<style scoped>
.budget-summary {
  display: grid;
  gap: var(--space-4);
}
.budget-summary__metrics {
  display: grid;
  gap: var(--space-3);
}
@media (min-width: 48rem) {
  .budget-summary__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
