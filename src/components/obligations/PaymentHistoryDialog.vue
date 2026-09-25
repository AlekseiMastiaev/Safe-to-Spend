<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatMoney } from '@/domain/money'
import type { IsoDate } from '@/domain/models'
import type { ObligationPreview } from './preview'

defineProps<{
  preview: ObligationPreview
}>()

const emit = defineEmits<{
  close: []
  editPayment: [id: string]
  deletePayment: [id: string]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatPaymentDate(date: IsoDate): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

function closeDialog(): void {
  if (dialog.value?.open) {
    dialog.value.close()
  } else {
    emit('close')
  }
}

onMounted(() => {
  dialog.value?.showModal?.()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="payment-history-dialog"
    aria-labelledby="payment-history-title"
    @close="emit('close')"
  >
    <div class="payment-history-dialog__heading">
      <h3 id="payment-history-title">История платежей: {{ preview.obligation.title }}</h3>
      <button type="button" autofocus @click="closeDialog">Закрыть</button>
    </div>

    <ul v-if="preview.payments.length > 0" class="payment-history-dialog__list">
      <li v-for="payment in preview.payments" :key="payment.id">
        <div class="payment-history-dialog__payment">
          <time :datetime="payment.paidAt">{{ formatPaymentDate(payment.paidAt) }}</time>
          <strong>{{ formatMoney(payment.amount) }}</strong>
        </div>
        <p v-if="payment.note">{{ payment.note }}</p>
        <div class="payment-history-dialog__actions">
          <button type="button" @click="emit('editPayment', payment.id)">Изменить</button>
          <button
            class="payment-history-dialog__delete"
            type="button"
            @click="emit('deletePayment', payment.id)"
          >
            Удалить
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="payment-history-dialog__empty">Платежей пока нет.</p>

    <p class="payment-history-dialog__total">
      Итого оплачено: {{ formatMoney(preview.actualPaid) }}
    </p>
  </dialog>
</template>

<style scoped>
.payment-history-dialog {
  width: min(calc(100% - 2rem), 34rem);
  max-height: calc(100dvh - 2rem);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
}

.payment-history-dialog::backdrop {
  background: rgb(15 23 42 / 60%);
}

.payment-history-dialog__heading,
.payment-history-dialog__payment {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: var(--font-size-lg);
}

button {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-interactive);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid var(--color-interactive);
  outline-offset: 2px;
}

.payment-history-dialog__list {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-4) 0;
  padding: 0;
  list-style: none;
}

.payment-history-dialog__list li {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.payment-history-dialog__list p {
  margin-top: var(--space-2);
  color: var(--color-muted);
}

.payment-history-dialog__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.payment-history-dialog__delete {
  border-color: var(--color-negative);
  color: var(--color-negative);
}

.payment-history-dialog__empty {
  margin: var(--space-4) 0;
  color: var(--color-muted);
}

.payment-history-dialog__total {
  font-weight: 700;
}
</style>
