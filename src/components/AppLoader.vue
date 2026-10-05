<script setup lang="ts">
import AppBrand from '@/components/AppBrand.vue'

defineProps<{
  message: string
}>()
</script>

<template>
  <main class="app-loader" role="status" aria-live="polite" aria-atomic="true">
    <div class="app-loader__content">
      <AppBrand size="large" />
      <span class="app-loader__indicator" aria-hidden="true"></span>
      <p>{{ message }}</p>
    </div>
  </main>
</template>

<style scoped>
.app-loader {
  display: grid;
  min-height: 100vh;
  padding: var(--space-4);
  place-items: center;
}

.app-loader__content {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  text-align: center;
}

.app-loader__indicator {
  width: 1.75rem;
  height: 1.75rem;
  border: 3px solid var(--color-interactive-subtle);
  border-top-color: var(--color-interactive);
  border-radius: 50%;
  animation: app-loader-spin 0.8s linear infinite;
}

.app-loader p {
  margin: 0;
  color: var(--color-muted);
  line-height: 1.5;
}

@keyframes app-loader-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-loader__indicator {
    animation: none;
  }
}
</style>
