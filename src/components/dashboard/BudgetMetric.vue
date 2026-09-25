<script setup lang="ts">
defineProps<{
  label: string
  amount: string
  detail: string
}>()
</script>

<template>
  <article class="budget-metric">
    <h3>{{ label }}</h3>
    <p class="budget-metric__amount">{{ amount }}</p>
    <p class="budget-metric__detail">{{ detail }}</p>
  </article>
</template>

<style scoped>
.budget-metric {
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
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
.budget-metric__amount {
  margin-top: var(--space-2);
  font-size: var(--font-size-xl);
  font-weight: 700;
  overflow-wrap: anywhere;
}
.budget-metric__detail {
  margin-top: var(--space-2);
  color: var(--color-muted);
  font-size: 0.875rem;
  line-height: 1.4;
}
</style>
