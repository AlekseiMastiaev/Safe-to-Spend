<script setup lang="ts">
import type { Income } from '@/domain/models'
import EmptyIncomeList from './EmptyIncomeList.vue'
import IncomeListItem from './IncomeListItem.vue'

const props = defineProps<{
  incomes: readonly Income[]
}>()

const emit = defineEmits<{
  toggleReceived: [id: Income['id']]
  edit: [id: Income['id']]
  delete: [id: Income['id']]
}>()
</script>

<template>
  <ul v-if="props.incomes.length > 0" class="income-list">
    <li v-for="income in props.incomes" :key="income.id">
      <IncomeListItem
        :income="income"
        @toggle-received="emit('toggleReceived', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </li>
  </ul>
  <EmptyIncomeList v-else />
</template>

<style scoped>
.income-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
