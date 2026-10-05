<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { formatMoney } from '@/domain/money'
import type { FreeExpense } from '@/domain/models'

const props = defineProps<{
  expense: FreeExpense
}>()

const emit = defineEmits<{
  edit: [id: FreeExpense['id']]
  delete: [id: FreeExpense['id']]
}>()

const actionsOpen = ref(false)
const actionsId = computed(() => `free-expense-actions-${props.expense.id}`)

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
  <article class="free-expense-list-item">
    <div class="free-expense-list-item__details">
      <h3>{{ expense.title }}</h3>
      <time :datetime="expense.spentAt">{{ formattedDate }}</time>
    </div>

    <p class="free-expense-list-item__amount">{{ formatMoney(expense.amount) }}</p>

    <button
      class="free-expense-list-item__actions-toggle"
      type="button"
      :aria-label="`Действия с тратой: ${expense.title}`"
      :aria-expanded="actionsOpen"
      :aria-controls="actionsId"
      @click="actionsOpen = !actionsOpen"
    >
      <AppIcon name="more-horizontal" />
    </button>

    <div
      v-if="actionsOpen"
      :id="actionsId"
      class="free-expense-list-item__actions"
      role="region"
      :aria-label="`Действия с тратой: ${expense.title}`"
    >
      <button type="button" @click="emit('edit', expense.id)">Изменить</button>
      <button
        class="free-expense-list-item__delete"
        type="button"
        @click="emit('delete', expense.id)"
      >
        Удалить
      </button>
    </div>
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

.free-expense-list-item__actions-toggle {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-color: transparent;
  border-radius: 50%;
  color: var(--color-muted);
  place-items: center;
}

.free-expense-list-item__actions-toggle:hover,
.free-expense-list-item__actions-toggle[aria-expanded='true'] {
  color: var(--color-interactive);
  background: var(--color-interactive-subtle);
}

.free-expense-list-item__actions-toggle :deep(.app-icon) {
  font-size: 1.25rem;
}

.free-expense-list-item__actions {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.free-expense-list-item__delete {
  border-color: var(--color-negative);
  color: var(--color-negative);
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
