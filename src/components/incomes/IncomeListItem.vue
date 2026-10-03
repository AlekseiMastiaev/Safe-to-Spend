<script setup lang="ts">
import { computed, ref } from 'vue'
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

const actionsOpen = ref(false)
const actionsId = computed(() => `income-actions-${props.income.id}`)
</script>

<template>
  <article class="income-list-item">
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
      :aria-expanded="actionsOpen"
      :aria-controls="actionsId"
      @click="actionsOpen = !actionsOpen"
    >
      Действия
      <span aria-hidden="true">{{ actionsOpen ? '−' : '+' }}</span>
    </button>

    <div
      v-if="actionsOpen"
      :id="actionsId"
      class="income-list-item__actions"
      role="region"
      :aria-label="`Действия с доходом: ${props.income.title}`"
    >
      <button type="button" @click="emit('toggleReceived', props.income.id)">
        {{ props.income.status === 'received' ? 'Вернуть в план' : 'Отметить полученным' }}
      </button>
      <button type="button" @click="emit('edit', props.income.id)">Изменить</button>
      <button
        class="income-list-item__delete"
        type="button"
        @click="emit('delete', props.income.id)"
      >
        Удалить
      </button>
    </div>
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

.income-list-item__actions {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.income-list-item__delete {
  border-color: var(--color-negative);
  color: var(--color-negative);
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
