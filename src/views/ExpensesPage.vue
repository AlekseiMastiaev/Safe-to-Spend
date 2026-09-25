<script setup lang="ts">
import { computed, ref } from 'vue'
import FreeExpenseList from '@/components/expenses/FreeExpenseList.vue'
import { invalidateData, useDataQuery } from '@/composables/useDataQuery'
import { parseMoneyInput } from '@/domain/money'
import type { EntityId, FreeExpense } from '@/domain/models'
import { getCurrentIsoDate } from '@/domain/month'
import { freeExpenseRepository, monthRepository } from '@/shared/persistence'
import { useNotificationStore } from '@/stores/notifications'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const selectedMonth = useSelectedMonthStore()
const notifications = useNotificationStore()
const data = useDataQuery(async () => {
  const monthKey = selectedMonth.selectedMonthKey
  if (monthKey === null) throw new Error('Бюджетный месяц не выбран')
  const month = await monthRepository.findByMonthKey(monthKey)
  if (!month) throw new Error('Выбранный месяц не найден')
  return { month, expenses: await freeExpenseRepository.listByMonth(month.id) }
})

const expenses = computed(() => (data.value.status === 'ready' ? data.value.data.expenses : []))
const selectedExpenseId = ref<EntityId | null>(null)
const selectedExpense = computed(() =>
  expenses.value.find((expense) => expense.id === selectedExpenseId.value),
)
const title = ref('')
const amount = ref('')
const spentAt = ref(getCurrentIsoDate())
const editingId = ref<EntityId | null>(null)
const isSaving = ref(false)
const formError = ref<string | null>(null)

function selectExpense(id: EntityId): void {
  selectedExpenseId.value = selectedExpenseId.value === id ? null : id
}

function editSelectedExpense(): void {
  const expense = selectedExpense.value
  if (!expense) return
  editingId.value = expense.id
  title.value = expense.title
  amount.value = String(expense.amount / 100).replace('.', ',')
  spentAt.value = expense.spentAt
  formError.value = null
}

function resetForm(): void {
  title.value = ''
  amount.value = ''
  spentAt.value = getCurrentIsoDate()
  editingId.value = null
  formError.value = null
}

async function saveExpense(): Promise<void> {
  if (data.value.status !== 'ready' || isSaving.value) return
  isSaving.value = true
  formError.value = null
  try {
    const normalizedTitle = title.value.trim()
    if (!normalizedTitle) throw new Error('Укажите название траты')
    const timestamp = new Date().toISOString()
    const existing = editingId.value
      ? expenses.value.find((expense) => expense.id === editingId.value)
      : undefined
    const expense: FreeExpense = {
      id: existing?.id ?? crypto.randomUUID(),
      monthId: data.value.data.month.id,
      title: normalizedTitle,
      amount: parseMoneyInput(amount.value),
      spentAt: spentAt.value,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    await freeExpenseRepository.save(expense)
    invalidateData()
    selectedExpenseId.value = expense.id
    resetForm()
    notifications.notifySuccess(existing ? 'Трата обновлена' : 'Трата добавлена')
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Не удалось сохранить трату'
  } finally {
    isSaving.value = false
  }
}

async function deleteSelectedExpense(): Promise<void> {
  const expense = selectedExpense.value
  if (!expense || !window.confirm(`Удалить трату «${expense.title}»?`)) return
  try {
    await freeExpenseRepository.delete(expense.id)
    invalidateData()
    selectedExpenseId.value = null
    if (editingId.value === expense.id) resetForm()
    notifications.notifySuccess('Трата удалена')
  } catch {
    notifications.notifyError('Не удалось удалить трату')
  }
}
</script>

<template>
  <section class="page-stack" aria-labelledby="expenses-title">
    <div class="page-heading">
      <h2 id="expenses-title">Свободные расходы</h2>
      <p>Покупки и необязательные траты сразу уменьшают фактический и безопасный остаток.</p>
    </div>

    <form class="panel form-grid" @submit.prevent="saveExpense">
      <h3>{{ editingId ? 'Изменить трату' : 'Добавить трату' }}</h3>
      <label class="field">
        <span>Название</span>
        <input v-model="title" required autocomplete="off" placeholder="Например, продукты" />
      </label>
      <label class="field">
        <span>Сумма, ₽</span>
        <input
          v-model="amount"
          required
          inputmode="decimal"
          autocomplete="off"
          placeholder="1 250"
        />
      </label>
      <label class="field">
        <span>Дата</span>
        <input v-model="spentAt" required type="date" />
      </label>
      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
      <div class="button-row">
        <button class="button" type="submit" :disabled="isSaving">
          {{ isSaving ? 'Сохраняем…' : editingId ? 'Сохранить изменения' : 'Добавить трату' }}
        </button>
        <button v-if="editingId" class="button button--secondary" type="button" @click="resetForm">
          Отмена
        </button>
      </div>
    </form>

    <p v-if="data.status === 'loading'" role="status">Загружаем траты…</p>
    <p v-else-if="data.status === 'error'" class="form-error" role="alert">
      Не удалось загрузить траты.
    </p>
    <template v-else>
      <FreeExpenseList
        :expenses="expenses"
        :selected-id="selectedExpenseId"
        @select="selectExpense"
      />
      <div v-if="selectedExpense" class="panel selection-actions">
        <strong>{{ selectedExpense.title }}</strong>
        <div class="button-row">
          <button class="button button--secondary" type="button" @click="editSelectedExpense">
            Изменить
          </button>
          <button class="button button--danger" type="button" @click="deleteSelectedExpense">
            Удалить
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
