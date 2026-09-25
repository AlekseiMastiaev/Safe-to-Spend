<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/domain/money'
import type { MoneyMinorUnits } from '@/domain/models'

const props = defineProps<{
  title: string
  plannedAmount: MoneyMinorUnits
  actualPaid: MoneyMinorUnits
  remainingReserve: MoneyMinorUnits
  isSettled: boolean
}>()

const paymentState = computed(() => {
  if (props.isSettled) return 'Закрыт'
  if (props.actualPaid > 0) return 'Частично оплачен'
  return 'Не начат'
})

const progressPercent = computed(() =>
  props.plannedAmount > 0
    ? Math.min(Math.round((props.actualPaid / props.plannedAmount) * 100), 100)
    : 0,
)
</script>

<template>
  <article class="payment-progress">
    <div class="payment-progress__heading">
      <h3>{{ title }}</h3>
      <span>{{ paymentState }}</span>
    </div>
    <p>Оплачено: {{ formatMoney(actualPaid) }} · План: {{ formatMoney(plannedAmount) }}</p>
    <progress :value="progressPercent" max="100" :aria-label="`Оплата: ${title}`">
      {{ progressPercent }}%
    </progress>
    <p>Осталось зарезервировано: {{ formatMoney(remainingReserve) }}</p>
  </article>
</template>

<style scoped>
.payment-progress {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.payment-progress__heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
}
h3,
p {
  margin: 0;
}
h3 {
  font-size: 1rem;
}
.payment-progress__heading span,
p {
  color: var(--color-muted);
  font-size: 0.875rem;
}
progress {
  display: block;
  width: 100%;
  height: 0.75rem;
  margin-top: var(--space-3);
  accent-color: var(--color-positive);
}
p {
  margin-top: var(--space-2);
}
</style>
