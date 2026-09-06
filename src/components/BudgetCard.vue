<script setup lang="ts">
type BudgetCardState = 'neutral' | 'positive' | 'warning'

const props = defineProps<{
  title: string
  amount: string
  label: string
  state: BudgetCardState
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <article class="budget-card" :class="`budget-card--${props.state}`">
    <p class="budget-card__title">{{ props.title }}</p>
    <p class="budget-card__amount">{{ props.amount }}</p>
    <p class="budget-card__label">{{ props.label }}</p>

    <button type="button" :aria-pressed="props.selected" @click="emit('select')">
      {{ props.selected ? 'Выбрано' : 'Выбрать' }}
    </button>
  </article>
</template>

<style scoped>
.budget-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.budget-card--positive {
  border-color: var(--color-positive);
}

.budget-card--warning {
  border-color: var(--color-warning);
}

.budget-card__title,
.budget-card__amount,
.budget-card__label {
  margin: 0;
}

.budget-card__title,
.budget-card__label {
  color: var(--color-muted);
}

.budget-card__amount {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

button {
  justify-self: start;
  margin-top: var(--space-2);
  padding: var(--space-2) calc(var(--space-2) + var(--space-1));
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
</style>
