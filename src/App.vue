<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useDexieLiveQuery } from '@/composables/useDexieLiveQuery'
import { getCurrentMonthKey } from '@/domain/month'
import { APP_ROUTE_NAMES } from '@/router/navigation'
import { db } from '@/shared/db/database'
import { DexieMonthRepository } from '@/shared/db/repositories'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const route = useRoute()
const router = useRouter()
const selectedMonth = useSelectedMonthStore()
const months = useDexieLiveQuery(() => new DexieMonthRepository(db).list())

watch(
  [months, () => route.name, () => selectedMonth.selectedMonthKey],
  ([state, routeName]) => {
    if (state.status !== 'ready' || routeName === undefined) return

    if (state.data.length === 0) {
      selectedMonth.clearSelectedMonth()
    } else if (
      selectedMonth.selectedMonthKey === null ||
      !state.data.some((month) => month.monthKey === selectedMonth.selectedMonthKey)
    ) {
      const currentMonthKey = getCurrentMonthKey()
      const initialMonth =
        state.data.find((month) => month.monthKey === currentMonthKey) ??
        state.data[state.data.length - 1]
      if (initialMonth) selectedMonth.setSelectedMonthKey(initialMonth.monthKey)
    }

    if (state.data.length === 0 && routeName !== APP_ROUTE_NAMES.onboarding) {
      void router.replace({ name: APP_ROUTE_NAMES.onboarding })
    } else if (state.data.length > 0 && routeName === APP_ROUTE_NAMES.onboarding) {
      void router.replace({ name: APP_ROUTE_NAMES.dashboard })
    }
  },
  { immediate: true },
)

const showLayout = computed(() => {
  const state = months.value
  if (state.status !== 'ready') return false
  return state.data.length === 0
    ? route.name === APP_ROUTE_NAMES.onboarding
    : route.name !== APP_ROUTE_NAMES.onboarding && selectedMonth.selectedMonthKey !== null
})

function reloadPage(): void {
  window.location.reload()
}
</script>

<template>
  <main v-if="months.status === 'loading'" class="startup-state" role="status">
    Открываем локальные данные…
  </main>
  <main v-else-if="months.status === 'error'" class="startup-state" role="alert">
    <p>Не удалось прочитать локальные данные. Проверьте доступ к хранилищу браузера.</p>
    <button type="button" @click="reloadPage">Повторить</button>
  </main>
  <AppLayout v-else-if="showLayout" />
  <main v-else class="startup-state" role="status">Открываем нужную страницу…</main>
</template>

<style scoped>
.startup-state {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-4);
}

.startup-state button {
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  color: var(--color-interactive-contrast);
  background: var(--color-interactive);
  cursor: pointer;
}
</style>
