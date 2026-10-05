<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import AppLoader from '@/components/AppLoader.vue'
import { useDataQuery } from '@/composables/useDataQuery'
import { getCurrentMonthKey } from '@/domain/month'
import { APP_ROUTE_NAMES } from '@/router/navigation'
import { monthRepository, persistenceMode } from '@/shared/persistence'
import { useAuthStore } from '@/stores/auth'
import { useSelectedMonthStore } from '@/stores/selectedMonth'
import AuthPage from '@/views/AuthPage.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const selectedMonth = useSelectedMonthStore()
void auth.initialize()
const months = useDataQuery(
  () => monthRepository.list(),
  () => auth.isAuthenticated,
)

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
  <AppLoader v-if="auth.status === 'idle' || auth.status === 'loading'" message="Проверяем вход…" />
  <main v-else-if="auth.status === 'error'" class="startup-state" role="alert">
    <p>Не удалось проверить сессию. Обновите страницу и попробуйте снова.</p>
    <button type="button" @click="reloadPage">Обновить</button>
  </main>
  <AuthPage v-else-if="!auth.isAuthenticated" />
  <AppLoader
    v-else-if="months.status === 'idle' || months.status === 'loading'"
    :message="
      persistenceMode === 'cloud' ? 'Загружаем облачный бюджет…' : 'Открываем локальные данные…'
    "
  />
  <main v-else-if="months.status === 'error'" class="startup-state" role="alert">
    <p>
      {{
        persistenceMode === 'cloud'
          ? 'Не удалось загрузить облачные данные. Проверьте соединение и попробуйте снова.'
          : 'Не удалось прочитать локальные данные. Проверьте доступ к хранилищу браузера.'
      }}
    </p>
    <button type="button" @click="reloadPage">Повторить</button>
  </main>
  <AppLayout v-else-if="showLayout" />
  <AppLoader v-else message="Открываем нужную страницу…" />
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
