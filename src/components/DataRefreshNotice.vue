<script setup lang="ts">
import { invalidateData, type DataQueryState } from '@/composables/useDataQuery'

defineProps<{ state: DataQueryState<unknown> }>()
</script>

<template>
  <div
    v-if="state.status === 'ready' && state.refreshError !== null"
    class="panel refresh-notice"
    role="alert"
  >
    <p>Не удалось обновить данные. Показаны последние загруженные значения.</p>
    <button class="button button--secondary" type="button" @click="invalidateData">
      Повторить
    </button>
  </div>
</template>

<style scoped>
.refresh-notice {
  display: grid;
  gap: var(--space-2);
}
</style>
