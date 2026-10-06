<script setup lang="ts">
import ItemActionsMenu from '@/components/ItemActionsMenu.vue'
import { formatMoney } from '@/domain/money'
import type { Income } from '@/domain/models'

const props = defineProps<{
  income: Income
}>()

const emit = defineEmits<{
  toggleReceived: [id: Income['id']]
  edit: [id: Income['id']]
  delete: [id: Income['id']]
}>()
</script>

<template>
  <article class="income-list-item">
    <div class="income-list-item__details">
      <h3>{{ props.income.title }}</h3>
    </div>

    <p class="income-list-item__amount">{{ formatMoney(props.income.amount) }}</p>

    <span
      class="income-list-item__status"
      :class="
        props.income.status === 'received'
          ? 'income-list-item__status--received'
          : 'income-list-item__status--planned'
      "
    >
      {{ props.income.status === 'received' ? 'Получен' : 'Запланирован' }}
    </span>

    <ItemActionsMenu :label="`Действия с доходом: ${props.income.title}`">
      <button type="button" @click="emit('toggleReceived', props.income.id)">
        {{ props.income.status === 'received' ? 'Вернуть в план' : 'Отметить полученным' }}
      </button>
      <button type="button" @click="emit('edit', props.income.id)">Изменить</button>
      <button
        class="item-actions-menu__danger"
        type="button"
        @click="emit('delete', props.income.id)"
      >
        Удалить
      </button>
    </ItemActionsMenu>
  </article>
</template>

<style scoped>
.income-list-item {
  position: relative;
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) calc(var(--space-3) + 3rem) var(--space-3) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.income-list-item__details {
  min-width: 0;
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 1rem;
}

.income-list-item__status {
  justify-self: start;
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

@media (min-width: 36rem) {
  .income-list-item {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-3);
  }

  .income-list-item__status {
    grid-column: 1 / -1;
  }
}
</style>
