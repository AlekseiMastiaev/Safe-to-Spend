<script setup lang="ts">
import type { EntityId } from '@/domain/models'
import ObligationListItem from './ObligationListItem.vue'
import type { ObligationPreview } from './preview'

const props = withDefaults(
  defineProps<{
    previews: readonly ObligationPreview[]
    emptyMessage?: string
  }>(),
  {
    emptyMessage: 'Обязательных расходов пока нет.',
  },
)

const emit = defineEmits<{
  showHistory: [id: EntityId]
  addPayment: [id: EntityId]
  edit: [id: EntityId]
  toggleSettled: [id: EntityId]
  delete: [id: EntityId]
}>()
</script>

<template>
  <ul v-if="props.previews.length > 0" class="obligation-list">
    <li v-for="preview in props.previews" :key="preview.obligation.id">
      <ObligationListItem
        :preview="preview"
        @show-history="emit('showHistory', $event)"
        @add-payment="emit('addPayment', $event)"
        @edit="emit('edit', $event)"
        @toggle-settled="emit('toggleSettled', $event)"
        @delete="emit('delete', $event)"
      />
    </li>
  </ul>
  <p v-else class="obligation-list__empty">{{ props.emptyMessage }}</p>
</template>

<style scoped>
.obligation-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.obligation-list__empty {
  margin: 0;
  padding: var(--space-4);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-muted);
  text-align: center;
}
</style>
