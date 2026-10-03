<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatMoney } from '@/domain/money'
import type { EntityId } from '@/domain/models'
import ObligationProgress from './ObligationProgress.vue'
import type { ObligationPreview } from './preview'

const props = defineProps<{
  preview: ObligationPreview
}>()

const emit = defineEmits<{
  showHistory: [id: EntityId]
  addPayment: [id: EntityId]
  edit: [id: EntityId]
  toggleSettled: [id: EntityId]
  delete: [id: EntityId]
}>()

const state = computed(() => {
  if (props.preview.obligation.isSettled) return 'Закрыт'
  if (props.preview.actualPaid > 0) return 'Частично оплачен'
  return 'Не начат'
})

const actionsOpen = ref(false)
const actionsId = computed(() => `obligation-actions-${props.preview.obligation.id}`)
</script>

<template>
  <article
    class="obligation-list-item"
    :class="{ 'obligation-list-item--settled': preview.obligation.isSettled }"
  >
    <div class="obligation-list-item__heading">
      <h3>{{ preview.obligation.title }}</h3>
      <span
        class="obligation-list-item__state"
        :class="{ 'obligation-list-item__state--settled': preview.obligation.isSettled }"
      >
        {{ state }}
      </span>
    </div>

    <ObligationProgress
      v-if="!preview.obligation.isSettled"
      :title="preview.obligation.title"
      :planned-amount="preview.obligation.plannedAmount"
      :actual-paid="preview.actualPaid"
      :remaining-reserve="preview.remainingReserve"
    />

    <dl v-else class="obligation-list-item__settled-summary">
      <div>
        <dt>План</dt>
        <dd>{{ formatMoney(preview.obligation.plannedAmount) }}</dd>
      </div>
      <div>
        <dt>Оплачено</dt>
        <dd>{{ formatMoney(preview.actualPaid) }}</dd>
      </div>
    </dl>

    <p v-if="preview.savings > 0" class="obligation-list-item__savings">
      Экономия после закрытия: {{ formatMoney(preview.savings) }}
    </p>
    <p v-if="preview.overspend > 0" class="obligation-list-item__overspend">
      Перерасход: {{ formatMoney(preview.overspend) }}
    </p>

    <div class="obligation-list-item__primary-actions">
      <button
        v-if="!preview.obligation.isSettled"
        class="obligation-list-item__payment"
        type="button"
        @click="emit('addPayment', preview.obligation.id)"
      >
        Добавить платёж
      </button>
      <button
        type="button"
        :aria-label="`История платежей: ${preview.obligation.title}`"
        @click="emit('showHistory', preview.obligation.id)"
      >
        История
      </button>
      <button
        type="button"
        :aria-expanded="actionsOpen"
        :aria-controls="actionsId"
        @click="actionsOpen = !actionsOpen"
      >
        Действия
        <span aria-hidden="true">{{ actionsOpen ? '−' : '+' }}</span>
      </button>
    </div>

    <div
      v-if="actionsOpen"
      :id="actionsId"
      class="obligation-list-item__actions"
      role="region"
      :aria-label="`Действия с расходом: ${preview.obligation.title}`"
    >
      <button type="button" @click="emit('toggleSettled', preview.obligation.id)">
        {{ preview.obligation.isSettled ? 'Открыть снова' : 'Закрыть расход' }}
      </button>
      <button type="button" @click="emit('edit', preview.obligation.id)">Изменить</button>
      <button
        class="obligation-list-item__delete"
        type="button"
        @click="emit('delete', preview.obligation.id)"
      >
        Удалить
      </button>
    </div>
  </article>
</template>

<style scoped>
.obligation-list-item {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.obligation-list-item--settled {
  border-color: var(--color-positive-border);
}

.obligation-list-item__heading {
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
  font-size: 1rem;
}

.obligation-list-item__state {
  padding: var(--space-1) var(--space-2);
  border-radius: 999px;
  background: var(--color-interactive-subtle);
  color: var(--color-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

.obligation-list-item__state--settled {
  background: var(--color-positive-badge);
  color: var(--color-positive-strong);
}

.obligation-list-item__savings {
  color: var(--color-positive);
}

.obligation-list-item__overspend {
  color: var(--color-negative);
}

button {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-interactive);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.obligation-list-item__settled-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin: 0;
}

.obligation-list-item__settled-summary div {
  min-width: 7rem;
}

.obligation-list-item__settled-summary dt {
  color: var(--color-muted);
  font-size: 0.875rem;
}

.obligation-list-item__settled-summary dd {
  margin: var(--space-1) 0 0;
  font-weight: 700;
}

.obligation-list-item__primary-actions,
.obligation-list-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.obligation-list-item__payment {
  color: var(--color-interactive-contrast);
  background: var(--color-interactive);
}

.obligation-list-item__actions {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.obligation-list-item__delete {
  border-color: var(--color-negative);
  color: var(--color-negative);
}

button:focus-visible {
  outline: 2px solid var(--color-interactive);
  outline-offset: 2px;
}

@media (max-width: 35.99rem) {
  .obligation-list-item__primary-actions > button {
    flex: 1 1 auto;
  }
}
</style>
