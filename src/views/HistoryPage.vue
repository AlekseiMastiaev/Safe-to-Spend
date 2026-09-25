<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDexieLiveQuery } from '@/composables/useDexieLiveQuery'
import type { BudgetMonth } from '@/domain/models'
import { getCurrentMonthKey, parseMonthKey } from '@/domain/month'
import { APP_ROUTE_NAMES } from '@/router/navigation'
import { db } from '@/shared/db/database'
import { DexieMonthRepository } from '@/shared/db/repositories'
import { DexieBudgetWriteRepository } from '@/shared/db/transactions'
import { useNotificationStore } from '@/stores/notifications'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const router = useRouter()
const selectedMonth = useSelectedMonthStore()
const notifications = useNotificationStore()
const monthRepository = new DexieMonthRepository(db)
const writer = new DexieBudgetWriteRepository(db)
const monthsState = useDexieLiveQuery(() => monthRepository.list())
const months = computed(() =>
  monthsState.value.status === 'ready' ? [...monthsState.value.data].reverse() : [],
)
const newMonthKey = ref(getCurrentMonthKey())
const isCreating = ref(false)
const createError = ref<string | null>(null)

function openMonth(month: BudgetMonth): void {
  selectedMonth.setSelectedMonthKey(month.monthKey)
  void router.push({ name: APP_ROUTE_NAMES.dashboard })
}

async function createMonth(): Promise<void> {
  if (monthsState.value.status !== 'ready' || isCreating.value) return
  isCreating.value = true
  createError.value = null
  try {
    const parsedMonthKey = parseMonthKey(newMonthKey.value)
    if (parsedMonthKey === null) throw new Error('Выберите корректный месяц')
    if (monthsState.value.data.some((month) => month.monthKey === parsedMonthKey)) {
      throw new Error('Такой бюджетный месяц уже существует')
    }
    const timestamp = new Date().toISOString()
    const month: BudgetMonth = {
      id: crypto.randomUUID(),
      monthKey: parsedMonthKey,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const source =
      monthsState.value.data.find(
        (candidate) => candidate.monthKey === selectedMonth.selectedMonthKey,
      ) ?? monthsState.value.data[monthsState.value.data.length - 1]
    await writer.createMonthFromSource(month, source?.id ?? null)
    selectedMonth.setSelectedMonthKey(month.monthKey)
    notifications.notifySuccess('Новый месяц создан, планы обязательных расходов скопированы')
    await router.push({ name: APP_ROUTE_NAMES.dashboard })
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Не удалось создать месяц'
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <section class="page-stack" aria-labelledby="history-title">
    <div class="page-heading">
      <h2 id="history-title">Месяцы</h2>
      <p>Переключайтесь между бюджетами или создайте новый месяц на основе текущих планов.</p>
    </div>

    <form class="panel form-grid" @submit.prevent="createMonth">
      <h3>Новый бюджетный месяц</h3>
      <label class="field">
        <span>Месяц</span>
        <input v-model="newMonthKey" required type="month" />
      </label>
      <p v-if="createError" class="form-error" role="alert">{{ createError }}</p>
      <button class="button" type="submit" :disabled="isCreating">
        {{ isCreating ? 'Создаём…' : 'Создать месяц' }}
      </button>
    </form>

    <p v-if="monthsState.status === 'loading'" role="status">Загружаем месяцы…</p>
    <p v-else-if="monthsState.status === 'error'" class="form-error" role="alert">
      Не удалось загрузить историю.
    </p>
    <ul v-else class="month-list">
      <li v-for="month in months" :key="month.id">
        <button
          class="panel month-list__item"
          type="button"
          :aria-current="month.monthKey === selectedMonth.selectedMonthKey ? 'true' : undefined"
          @click="openMonth(month)"
        >
          <strong>{{ month.monthKey }}</strong>
          <span>{{
            month.monthKey === selectedMonth.selectedMonthKey ? 'Выбран' : 'Открыть'
          }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.month-list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.month-list__item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.month-list__item[aria-current='true'] {
  border-color: var(--color-interactive);
}

.month-list__item span {
  color: var(--color-muted);
}
</style>
