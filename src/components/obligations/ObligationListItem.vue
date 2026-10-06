<script setup lang="ts">
import ItemActionsMenu from '@/components/ItemActionsMenu.vue'
import { formatMoney } from '@/domain/money'
import type { EntityId } from '@/domain/models'
import ObligationProgress from './ObligationProgress.vue'
import type { ObligationPreview } from './preview'

defineProps<{
  preview: ObligationPreview
}>()

const emit = defineEmits<{
  showHistory: [id: EntityId]
  addPayment: [id: EntityId]
  edit: [id: EntityId]
  toggleSettled: [id: EntityId]
  delete: [id: EntityId]
}>()
</script>

<template>
  <article
    class="obligation-list-item"
    :class="{ 'obligation-list-item--settled': preview.obligation.isSettled }"
  >
    <div class="obligation-list-item__heading">
      <h3>{{ preview.obligation.title }}</h3>
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

    <ItemActionsMenu :label="`Действия с расходом: ${preview.obligation.title}`">
      <button
        v-if="!preview.obligation.isSettled"
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
      <button type="button" @click="emit('toggleSettled', preview.obligation.id)">
        {{ preview.obligation.isSettled ? 'Открыть снова' : 'Закрыть расход' }}
      </button>
      <button type="button" @click="emit('edit', preview.obligation.id)">Изменить</button>
      <button
        class="item-actions-menu__danger"
        type="button"
        @click="emit('delete', preview.obligation.id)"
      >
        Удалить
      </button>
    </ItemActionsMenu>
  </article>
</template>

<style scoped>
.obligation-list-item {
  position: relative;
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3) calc(var(--space-3) + 3rem) var(--space-3) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.obligation-list-item--settled {
  border-color: var(--color-positive-border);
}

.obligation-list-item__heading {
  min-width: 0;
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 1rem;
}

.obligation-list-item__savings {
  color: var(--color-positive);
}

.obligation-list-item__overspend {
  color: var(--color-negative);
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
</style>
