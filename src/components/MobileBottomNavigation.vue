<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { NavigationItem } from '@/router/navigation'

defineProps<{
  items: readonly NavigationItem[]
}>()
</script>

<template>
  <nav class="mobile-bottom-navigation" aria-label="Мобильная навигация">
    <RouterLink
      v-for="item in items"
      :key="item.routeName"
      :to="{ name: item.routeName }"
      :aria-label="item.label"
    >
      {{ item.shortLabel }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.mobile-bottom-navigation {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

a {
  min-width: 0;
  padding: calc(var(--space-2) + var(--space-1)) var(--space-1);
  color: var(--color-muted);
  font-size: var(--font-size-sm);
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
}

a.router-link-exact-active {
  background: var(--color-interactive-subtle);
  color: var(--color-interactive);
  font-weight: 700;
}

@media (min-width: 48rem) {
  .mobile-bottom-navigation {
    display: none;
  }
}
</style>
