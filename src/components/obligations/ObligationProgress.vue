<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/domain/money'
import type { MoneyMinorUnits } from '@/domain/models'

const props = defineProps<{
  title: string
  plannedAmount: MoneyMinorUnits
  actualPaid: MoneyMinorUnits
  remainingReserve: MoneyMinorUnits
}>()

const progressPercent = computed(() =>
  props.plannedAmount > 0
    ? Math.min(Math.max(Math.round((props.actualPaid / props.plannedAmount) * 100), 0), 100)
    : 0,
)
</script>

<template>
  <div class="obligation-progress">
    <dl class="obligation-progress__amounts">
      <div>
        <dt>План</dt>
        <dd>{{ formatMoney(plannedAmount) }}</dd>
      </div>
      <div>
        <dt>Оплачено</dt>
        <dd>{{ formatMoney(actualPaid) }}</dd>
      </div>
      <div>
        <dt>Осталось в резерве</dt>
        <dd>{{ formatMoney(remainingReserve) }}</dd>
      </div>
    </dl>
    <progress :value="progressPercent" max="100" :aria-label="`Оплата: ${title}`">
      {{ progressPercent }}%
    </progress>
  </div>
</template>

<style scoped>
.obligation-progress {
  display: grid;
  gap: var(--space-3);
}

.obligation-progress__amounts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.obligation-progress__amounts div {
  min-width: 0;
}

dt {
  color: var(--color-muted);
  font-size: 0.875rem;
}

dd {
  margin: var(--space-1) 0 0;
  font-weight: 700;
  overflow-wrap: anywhere;
}

progress {
  width: 100%;
  height: 0.75rem;
  accent-color: var(--color-positive);
}
</style>
