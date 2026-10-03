<script setup lang="ts">
defineProps<{
  amount: string
  state: 'positive' | 'zero' | 'negative'
}>()
</script>

<template>
  <section class="primary-balance" :class="`primary-balance--${state}`">
    <h3>Безопасный остаток</h3>
    <p class="primary-balance__amount">{{ amount }}</p>
    <p v-if="state === 'zero'" class="primary-balance__explanation">Свободного остатка пока нет</p>
    <p v-else-if="state === 'negative'" class="primary-balance__explanation">
      Расходы и резервы превышают полученные деньги
    </p>
  </section>
</template>

<style scoped>
.primary-balance {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.primary-balance--positive {
  border-color: var(--color-positive);
}
.primary-balance--negative {
  border-color: var(--color-negative);
}
h3,
p {
  margin: 0;
}
h3 {
  color: var(--color-muted);
  font-size: 1rem;
  font-weight: 600;
}
.primary-balance__amount {
  margin-top: var(--space-2);
  font-size: clamp(2rem, 7vw, 3rem);
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.primary-balance--positive .primary-balance__amount {
  color: var(--color-positive);
}
.primary-balance--negative .primary-balance__amount {
  color: var(--color-negative);
}
.primary-balance__explanation {
  margin-top: var(--space-2);
  color: var(--color-muted);
  line-height: 1.5;
}
</style>
