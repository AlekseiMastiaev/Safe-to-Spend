<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/domain/money'
import type { FreeExpense } from '@/domain/models'

const props = defineProps<{
  expense: FreeExpense
  selected: boolean
}>()

const emit = defineEmits<{
  select: [id: FreeExpense['id']]
}>()

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const formattedDate = computed(() =>
  dateFormatter.format(new Date(`${props.expense.spentAt}T00:00:00Z`)),
)
</script>

<template>
  <article class="free-expense-list-item" :class="{ 'free-expense-list-item--selected': selected }">
    <div class="free-expense-list-item__details">
      <h3>{{ expense.title }}</h3>
      <time :datetime="expense.spentAt">{{ formattedDate }}</time>
    </div>

    <p class="free-expense-list-item__amount">{{ formatMoney(expense.amount) }}</p>

    <button
      type="button"
      :aria-pressed="selected"
      :aria-label="`${selected ? 'Снять выбор' : 'Выбрать'}: ${expense.title}`"
      @click="emit('select', expense.id)"
    >
      {{ selected ? 'Выбрано' : 'Выбрать' }}
    </button>
  </article>
</template>

<style scoped>
.free-expense-list-item {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.free-expense-list-item--selected {
  border-color: var(--color-interactive);
}

.free-expense-list-item__details {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 1rem;
  overflow-wrap: anywhere;
}

time {
  color: var(--color-muted);
  font-size: 0.875rem;
}

.free-expense-list-item__amount {
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
  .free-expense-list-item {
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-3);
  }
}
</style>
