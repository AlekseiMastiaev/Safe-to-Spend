<script setup lang="ts">
import { computed, ref } from 'vue'
import AppDialog from '@/components/AppDialog.vue'
import IncomeList from '@/components/incomes/IncomeList.vue'
import { invalidateData, useDataQuery } from '@/composables/useDataQuery'
import { parseMoneyInput } from '@/domain/money'
import type { EntityId, Income } from '@/domain/models'
import { incomeRepository, monthRepository } from '@/shared/persistence'
import { useNotificationStore } from '@/stores/notifications'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const selectedMonth = useSelectedMonthStore()
const notifications = useNotificationStore()

const data = useDataQuery(async () => {
  const monthKey = selectedMonth.selectedMonthKey
  if (monthKey === null) throw new Error('Бюджетный месяц не выбран')
  const month = await monthRepository.findByMonthKey(monthKey)
  if (!month) throw new Error('Выбранный месяц не найден')
  return { month, incomes: await incomeRepository.listByMonth(month.id) }
})

const incomes = computed(() => (data.value.status === 'ready' ? data.value.data.incomes : []))
const title = ref('')
const amount = ref('')
const isReceived = ref(false)
const editingId = ref<EntityId | null>(null)
const isIncomeDialogOpen = ref(false)
const isSaving = ref(false)
const formError = ref<string | null>(null)

function openIncomeForm(): void {
  resetForm()
  isIncomeDialogOpen.value = true
}

function editIncome(id: EntityId): void {
  const income = incomes.value.find((item) => item.id === id)
  if (!income) return
  editingId.value = income.id
  title.value = income.title
  amount.value = String(income.amount / 100).replace('.', ',')
  isReceived.value = income.status === 'received'
  formError.value = null
  isIncomeDialogOpen.value = true
}

function resetForm(): void {
  title.value = ''
  amount.value = ''
  isReceived.value = false
  editingId.value = null
  formError.value = null
}

function closeIncomeForm(): void {
  isIncomeDialogOpen.value = false
  resetForm()
}

async function saveIncome(): Promise<void> {
  if (data.value.status !== 'ready' || isSaving.value) return
  isSaving.value = true
  formError.value = null

  try {
    const normalizedTitle = title.value.trim()
    if (!normalizedTitle) throw new Error('Укажите название дохода')
    const timestamp = new Date().toISOString()
    const existing = editingId.value
      ? incomes.value.find((income) => income.id === editingId.value)
      : undefined
    const base = {
      id: existing?.id ?? crypto.randomUUID(),
      monthId: data.value.data.month.id,
      title: normalizedTitle,
      amount: parseMoneyInput(amount.value),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    const income: Income = isReceived.value
      ? {
          ...base,
          status: 'received',
          receivedAt: existing?.status === 'received' ? existing.receivedAt : timestamp,
        }
      : { ...base, status: 'planned', receivedAt: null }

    await incomeRepository.save(income)
    invalidateData()
    closeIncomeForm()
    notifications.notifySuccess(existing ? 'Доход обновлён' : 'Доход добавлен')
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Не удалось сохранить доход'
  } finally {
    isSaving.value = false
  }
}

async function toggleReceived(id: EntityId): Promise<void> {
  const income = incomes.value.find((item) => item.id === id)
  if (!income) return
  const timestamp = new Date().toISOString()
  const updated: Income =
    income.status === 'received'
      ? { ...income, status: 'planned', receivedAt: null, updatedAt: timestamp }
      : { ...income, status: 'received', receivedAt: timestamp, updatedAt: timestamp }
  try {
    await incomeRepository.save(updated)
    invalidateData()
    notifications.notifySuccess(
      updated.status === 'received' ? 'Доход отмечен полученным' : 'Доход снова запланирован',
    )
  } catch {
    notifications.notifyError('Не удалось изменить статус дохода')
  }
}

async function deleteIncome(id: EntityId): Promise<void> {
  const income = incomes.value.find((item) => item.id === id)
  if (!income || !window.confirm(`Удалить доход «${income.title}»?`)) return
  try {
    await incomeRepository.delete(income.id)
    invalidateData()
    if (editingId.value === income.id) closeIncomeForm()
    notifications.notifySuccess('Доход удалён')
  } catch {
    notifications.notifyError('Не удалось удалить доход')
  }
}
</script>

<template>
  <section class="page-stack" aria-labelledby="incomes-title">
    <div class="page-heading page-heading--with-action">
      <div>
        <h2 id="incomes-title">Доходы</h2>
        <p>Запланированный доход попадёт в план, а полученный — в фактический баланс.</p>
      </div>
      <button class="button" type="button" @click="openIncomeForm">+ Добавить доход</button>
    </div>

    <p v-if="data.status === 'loading'" role="status">Загружаем доходы…</p>
    <p v-else-if="data.status === 'error'" class="form-error" role="alert">
      Не удалось загрузить доходы.
    </p>
    <template v-else>
      <IncomeList
        :incomes="incomes"
        @toggle-received="toggleReceived"
        @edit="editIncome"
        @delete="deleteIncome"
      />
    </template>

    <AppDialog
      v-if="isIncomeDialogOpen"
      :title="editingId ? 'Изменить доход' : 'Новый доход'"
      @close="closeIncomeForm"
    >
      <form class="form-grid" @submit.prevent="saveIncome">
        <label class="field">
          <span>Название</span>
          <input
            v-model="title"
            required
            autofocus
            autocomplete="off"
            placeholder="Например, зарплата"
          />
        </label>
        <label class="field">
          <span>Сумма, ₽</span>
          <input
            v-model="amount"
            required
            inputmode="decimal"
            autocomplete="off"
            placeholder="80 000"
          />
        </label>
        <label class="check-field">
          <input v-model="isReceived" type="checkbox" />
          Деньги уже получены
        </label>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div class="button-row">
          <button class="button" type="submit" :disabled="isSaving">
            {{ isSaving ? 'Сохраняем…' : editingId ? 'Сохранить изменения' : 'Добавить доход' }}
          </button>
          <button class="button button--secondary" type="button" @click="closeIncomeForm">
            Отмена
          </button>
        </div>
      </form>
    </AppDialog>
  </section>
</template>
