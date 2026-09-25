<script setup lang="ts">
import { formatMoney } from '@/domain/money'
import type { Income } from '@/domain/models'

const props = defineProps<{
  income: Income
  selected: boolean
}>()

const emit = defineEmits<{
  select: [id: Income['id']]
}>()
</script>

<template>
  <article class="income-list-item" :class="{ 'income-list-item--selected': props.selected }">
    <div class="income-list-item__details">
      <h3>{{ props.income.title }}</h3>
      <span v-if="props.income.status === 'received'" class="income-list-item__status--received">
        Получен
      </span>
      <span v-else class="income-list-item__status--planned">Запланирован</span>
    </div>

    <p class="income-list-item__amount">{{ formatMoney(props.income.amount) }}</p>

    <button
      type="button"
      :aria-pressed="props.selected"
      :aria-label="`${props.selected ? 'Снять выбор' : 'Выбрать'}: ${props.income.title}`"
      @click="emit('select', props.income.id)"
    >
      {{ props.selected ? 'Выбрано' : 'Выбрать' }}
    </button>
  </article>
</template>

<style scoped>
.income-list-item {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.income-list-item--selected {
  border-color: var(--color-interactive);
}

.income-list-item__details {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 1rem;
}

.income-list-item__details span {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.income-list-item__status--received {
  color: var(--color-positive);
  background: var(--color-background);
}

.income-list-item__status--planned {
  color: var(--color-warning);
  background: var(--color-background);
}

.income-list-item__amount {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

button {
  justify-self: start;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-interactive);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

button[aria-pressed='true'] {
  background: var(--color-interactive);
  color: var(--color-interactive-contrast);
}

button:focus-visible {
  outline: 2px solid var(--color-interactive);
  outline-offset: 2px;
}

@media (min-width: 36rem) {
  .income-list-item {
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-3);
  }
}
</style>
