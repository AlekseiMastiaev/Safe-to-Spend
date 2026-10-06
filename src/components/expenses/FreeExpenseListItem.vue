<script setup lang="ts">
import { computed } from 'vue'
import ItemActionsMenu from '@/components/ItemActionsMenu.vue'
import { formatMoney } from '@/domain/money'
import type { FreeExpense } from '@/domain/models'

const props = defineProps<{
  expense: FreeExpense
}>()

const emit = defineEmits<{
  edit: [id: FreeExpense['id']]
  delete: [id: FreeExpense['id']]
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
  <article class="free-expense-list-item">
    <div class="free-expense-list-item__details">
      <h3>{{ expense.title }}</h3>
      <time :datetime="expense.spentAt">{{ formattedDate }}</time>
    </div>

    <p class="free-expense-list-item__amount">{{ formatMoney(expense.amount) }}</p>

    <ItemActionsMenu :label="`Действия с тратой: ${expense.title}`">
      <button type="button" @click="emit('edit', expense.id)">Изменить</button>
      <button class="item-actions-menu__danger" type="button" @click="emit('delete', expense.id)">
        Удалить
      </button>
    </ItemActionsMenu>
  </article>
</template>

<style scoped>
.free-expense-list-item {
  position: relative;
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) calc(var(--space-3) + 3rem) var(--space-3) var(--space-3);
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

@media (min-width: 36rem) {
  .free-expense-list-item {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
  }
}
</style>
