<script setup lang="ts">
import { computed, ref } from 'vue'
import ObligationList from '@/components/obligations/ObligationList.vue'
import PaymentHistoryDialog from '@/components/obligations/PaymentHistoryDialog.vue'
import { createObligationPreview } from '@/components/obligations/preview'
import { invalidateData, useDataQuery } from '@/composables/useDataQuery'
import { formatMoney, parseMoneyAdditionExpression, parseMoneyInput } from '@/domain/money'
import type { EntityId, MonthlyObligation } from '@/domain/models'
import { getCurrentIsoDate } from '@/domain/month'
import {
  budgetWriter,
  monthRepository,
  obligationRepository,
  paymentRepository,
} from '@/shared/persistence'
import { useNotificationStore } from '@/stores/notifications'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const selectedMonth = useSelectedMonthStore()
const notifications = useNotificationStore()

const data = useDataQuery(async () => {
  const monthKey = selectedMonth.selectedMonthKey
  if (monthKey === null) throw new Error('Бюджетный месяц не выбран')
  const month = await monthRepository.findByMonthKey(monthKey)
  if (!month) throw new Error('Выбранный месяц не найден')
  const [obligations, payments] = await Promise.all([
    obligationRepository.listByMonth(month.id),
    paymentRepository.listByMonth(month.id),
  ])
  return { month, obligations, payments }
})

const previews = computed(() => {
  if (data.value.status !== 'ready') return []
  return data.value.data.obligations.map((obligation) =>
    createObligationPreview(
      obligation,
      data.value.status === 'ready' ? data.value.data.payments : [],
    ),
  )
})
const historyTargetId = ref<EntityId | null>(null)
const selectedPreview = computed(() =>
  previews.value.find((preview) => preview.obligation.id === historyTargetId.value),
)
const paymentTargetId = ref<EntityId | null>(null)
const paymentTarget = computed(() =>
  previews.value.find((preview) => preview.obligation.id === paymentTargetId.value),
)

const title = ref('')
const plannedAmount = ref('')
const editingObligationId = ref<EntityId | null>(null)
const obligationError = ref<string | null>(null)
const isSavingObligation = ref(false)

const paymentExpression = ref('')
const paidAt = ref(getCurrentIsoDate())
const paymentNote = ref('')
const editingPaymentId = ref<EntityId | null>(null)
const paymentError = ref<string | null>(null)
const isSavingPayment = ref(false)
const paymentPreviewTotal = computed(() => {
  try {
    return parseMoneyAdditionExpression(paymentExpression.value).reduce(
      (sum, value) => sum + value,
      0,
    )
  } catch {
    return null
  }
})

function resetObligationForm(): void {
  title.value = ''
  plannedAmount.value = ''
  editingObligationId.value = null
  obligationError.value = null
}

function editObligation(id: EntityId): void {
  const preview = previews.value.find((item) => item.obligation.id === id)
  if (!preview) return
  editingObligationId.value = id
  title.value = preview.obligation.title
  plannedAmount.value = String(preview.obligation.plannedAmount / 100).replace('.', ',')
  obligationError.value = null
}

async function saveObligation(): Promise<void> {
  if (data.value.status !== 'ready' || isSavingObligation.value) return
  isSavingObligation.value = true
  obligationError.value = null
  try {
    const normalizedTitle = title.value.trim()
    if (!normalizedTitle) throw new Error('Укажите название обязательного расхода')
    const timestamp = new Date().toISOString()
    const existing = editingObligationId.value
      ? data.value.data.obligations.find(
          (obligation) => obligation.id === editingObligationId.value,
        )
      : undefined
    const obligationBase = {
      id: existing?.id ?? crypto.randomUUID(),
      monthId: data.value.data.month.id,
      templateId: existing?.templateId ?? null,
      title: normalizedTitle,
      plannedAmount: parseMoneyInput(plannedAmount.value),
      sortOrder: existing?.sortOrder ?? data.value.data.obligations.length,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    const obligation: MonthlyObligation = existing?.isSettled
      ? { ...obligationBase, isSettled: true, settledAt: existing.settledAt }
      : { ...obligationBase, isSettled: false, settledAt: null }
    await obligationRepository.save(obligation)
    invalidateData()
    resetObligationForm()
    notifications.notifySuccess(
      existing ? 'Обязательный расход обновлён' : 'Обязательный расход добавлен',
    )
  } catch (error) {
    obligationError.value = error instanceof Error ? error.message : 'Не удалось добавить расход'
  } finally {
    isSavingObligation.value = false
  }
}

function openPayment(id: EntityId): void {
  paymentTargetId.value = id
  paymentExpression.value = ''
  paidAt.value = getCurrentIsoDate()
  paymentNote.value = ''
  editingPaymentId.value = null
  paymentError.value = null
}

function appendPaymentPart(): void {
  const value = paymentExpression.value.trimEnd()
  if (value.length > 0 && !value.endsWith('+')) paymentExpression.value = `${value} + `
}

async function savePayment(): Promise<void> {
  if (!paymentTarget.value || isSavingPayment.value) return
  isSavingPayment.value = true
  paymentError.value = null
  try {
    const amounts = parseMoneyAdditionExpression(paymentExpression.value)
    const existing = editingPaymentId.value
      ? data.value.status === 'ready'
        ? data.value.data.payments.find((payment) => payment.id === editingPaymentId.value)
        : undefined
      : undefined
    if (editingPaymentId.value && !existing) throw new Error('Платёж больше не существует')
    if (existing) {
      if (amounts.length !== 1) throw new Error('При изменении платежа укажите одну сумму')
      await paymentRepository.save({
        ...existing,
        amount: amounts[0]!,
        paidAt: paidAt.value,
        note: paymentNote.value.trim() || null,
        updatedAt: new Date().toISOString(),
      })
    } else {
      await budgetWriter.addObligationPayments({
        obligationId: paymentTarget.value.obligation.id,
        amounts,
        paidAt: paidAt.value,
        note: paymentNote.value.trim() || null,
      })
    }
    invalidateData()
    paymentTargetId.value = null
    editingPaymentId.value = null
    notifications.notifySuccess(existing ? 'Платёж обновлён' : 'Платёж добавлен')
  } catch (error) {
    paymentError.value = error instanceof Error ? error.message : 'Не удалось добавить платёж'
  } finally {
    isSavingPayment.value = false
  }
}

function editPayment(id: EntityId): void {
  if (data.value.status !== 'ready') return
  const payment = data.value.data.payments.find((item) => item.id === id)
  if (!payment) return
  historyTargetId.value = null
  paymentTargetId.value = payment.obligationId
  editingPaymentId.value = payment.id
  paymentExpression.value = String(payment.amount / 100).replace('.', ',')
  paidAt.value = payment.paidAt
  paymentNote.value = payment.note ?? ''
  paymentError.value = null
}

function cancelPayment(): void {
  paymentTargetId.value = null
  editingPaymentId.value = null
  paymentError.value = null
}

async function toggleSettled(id: EntityId): Promise<void> {
  const preview = previews.value.find((item) => item.obligation.id === id)
  if (!preview) return
  const timestamp = new Date().toISOString()
  const obligation: MonthlyObligation = preview.obligation.isSettled
    ? { ...preview.obligation, isSettled: false, settledAt: null, updatedAt: timestamp }
    : { ...preview.obligation, isSettled: true, settledAt: timestamp, updatedAt: timestamp }
  try {
    await obligationRepository.save(obligation)
    invalidateData()
    notifications.notifySuccess(obligation.isSettled ? 'Расход закрыт' : 'Расход снова открыт')
  } catch {
    notifications.notifyError('Не удалось изменить состояние расхода')
  }
}

async function deleteObligation(id: EntityId): Promise<void> {
  const preview = previews.value.find((item) => item.obligation.id === id)
  if (!preview || !window.confirm(`Удалить «${preview.obligation.title}» и все его платежи?`))
    return
  try {
    await budgetWriter.deleteObligationWithPayments(id)
    invalidateData()
    if (historyTargetId.value === id) historyTargetId.value = null
    if (paymentTargetId.value === id) paymentTargetId.value = null
    notifications.notifySuccess('Обязательный расход удалён')
  } catch {
    notifications.notifyError('Не удалось удалить обязательный расход')
  }
}

async function deletePayment(id: EntityId): Promise<void> {
  if (!window.confirm('Удалить этот платёж?')) return
  try {
    await paymentRepository.delete(id)
    invalidateData()
    notifications.notifySuccess('Платёж удалён')
  } catch {
    notifications.notifyError('Не удалось удалить платёж')
  }
}
</script>

<template>
  <section class="page-stack" aria-labelledby="obligations-title">
    <div class="page-heading">
      <h2 id="obligations-title">Обязательные расходы</h2>
      <p>План хранит резерв, платежи уменьшают его, а явное закрытие фиксирует экономию.</p>
    </div>

    <form class="panel form-grid" @submit.prevent="saveObligation">
      <h3>
        {{ editingObligationId ? 'Изменить обязательный расход' : 'Добавить обязательный расход' }}
      </h3>
      <label class="field">
        <span>Название</span>
        <input
          v-model="title"
          required
          autocomplete="off"
          placeholder="Например, коммунальные услуги"
        />
      </label>
      <label class="field">
        <span>План, ₽</span>
        <input
          v-model="plannedAmount"
          required
          inputmode="decimal"
          autocomplete="off"
          placeholder="10 000"
        />
      </label>
      <p v-if="obligationError" class="form-error" role="alert">{{ obligationError }}</p>
      <div class="button-row">
        <button class="button" type="submit" :disabled="isSavingObligation">
          {{
            isSavingObligation
              ? 'Сохраняем…'
              : editingObligationId
                ? 'Сохранить изменения'
                : 'Добавить расход'
          }}
        </button>
        <button
          v-if="editingObligationId"
          class="button button--secondary"
          type="button"
          @click="resetObligationForm"
        >
          Отмена
        </button>
      </div>
    </form>

    <form v-if="paymentTarget" class="panel form-grid" @submit.prevent="savePayment">
      <h3>
        {{ editingPaymentId ? 'Изменить платёж' : 'Платёж' }}: {{ paymentTarget.obligation.title }}
      </h3>
      <label class="field">
        <span>Сумма или сложение сумм, ₽</span>
        <input
          v-model="paymentExpression"
          required
          inputmode="decimal"
          autocomplete="off"
          placeholder="1 000 + 250,50"
        />
      </label>
      <button class="button button--secondary" type="button" @click="appendPaymentPart">
        + добавить сумму
      </button>
      <p v-if="paymentPreviewTotal !== null">
        Итого: <strong>{{ formatMoney(paymentPreviewTotal) }}</strong>
      </p>
      <label class="field">
        <span>Дата платежа</span>
        <input v-model="paidAt" required type="date" />
      </label>
      <label class="field">
        <span>Заметка (необязательно)</span>
        <input v-model="paymentNote" autocomplete="off" placeholder="Первый счёт" />
      </label>
      <p v-if="paymentError" class="form-error" role="alert">{{ paymentError }}</p>
      <div class="button-row">
        <button class="button" type="submit" :disabled="isSavingPayment">
          {{
            isSavingPayment
              ? 'Сохраняем…'
              : editingPaymentId
                ? 'Сохранить изменения'
                : 'Сохранить платёж'
          }}
        </button>
        <button class="button button--secondary" type="button" @click="cancelPayment">
          Отмена
        </button>
      </div>
    </form>

    <p v-if="data.status === 'loading'" role="status">Загружаем обязательные расходы…</p>
    <p v-else-if="data.status === 'error'" class="form-error" role="alert">
      Не удалось загрузить обязательные расходы.
    </p>
    <ObligationList
      v-else
      :previews="previews"
      @show-history="historyTargetId = $event"
      @add-payment="openPayment"
      @edit="editObligation"
      @toggle-settled="toggleSettled"
      @delete="deleteObligation"
    />

    <PaymentHistoryDialog
      v-if="selectedPreview"
      :preview="selectedPreview"
      @close="historyTargetId = null"
      @edit-payment="editPayment"
      @delete-payment="deletePayment"
    />
  </section>
</template>
