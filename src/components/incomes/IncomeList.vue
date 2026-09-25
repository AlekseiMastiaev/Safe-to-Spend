<script setup lang="ts">
import type { Income } from '@/domain/models'
import EmptyIncomeList from './EmptyIncomeList.vue'
import IncomeListItem from './IncomeListItem.vue'

const props = defineProps<{
  incomes: readonly Income[]
  selectedId: Income['id'] | null
}>()

const emit = defineEmits<{
  select: [id: Income['id']]
}>()
</script>

<template>
  <ul v-if="props.incomes.length > 0" class="income-list">
    <li v-for="income in props.incomes" :key="income.id">
      <IncomeListItem
        :income="income"
        :selected="income.id === props.selectedId"
        @select="emit('select', $event)"
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
