<script setup lang="ts">
import { computed } from 'vue'
import type { FreeExpense } from '@/domain/models'
import FreeExpenseListItem from './FreeExpenseListItem.vue'

const props = defineProps<{
  expenses: readonly FreeExpense[]
  selectedId: FreeExpense['id'] | null
}>()

const emit = defineEmits<{
  select: [id: FreeExpense['id']]
}>()

// spentAt stores only a day; creation time is a stable tie-breaker, not the payment time.
const orderedExpenses = computed(() =>
  [...props.expenses].sort(
    (left, right) =>
      right.spentAt.localeCompare(left.spentAt) ||
      right.createdAt.localeCompare(left.createdAt) ||
      left.id.localeCompare(right.id),
  ),
)
</script>

<template>
  <ul v-if="orderedExpenses.length > 0" class="free-expense-list">
    <li v-for="expense in orderedExpenses" :key="expense.id">
      <FreeExpenseListItem
        :expense="expense"
        :selected="expense.id === selectedId"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
  <p v-else class="free-expense-list__empty">Свободных расходов пока нет.</p>
</template>

<style scoped>
.free-expense-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.free-expense-list__empty {
  margin: 0;
  padding: var(--space-4);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-muted);
  text-align: center;
}
</style>
