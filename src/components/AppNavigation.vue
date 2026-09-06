<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { NavigationItem } from '@/router/navigation'

defineProps<{
  items: readonly NavigationItem[]
}>()
</script>

<template>
  <nav class="app-navigation" aria-label="Основная навигация">
    <RouterLink v-for="item in items" :key="item.routeName" :to="{ name: item.routeName }">
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-navigation {
  display: none;
}

@media (min-width: 48rem) {
  .app-navigation {
    display: flex;
    gap: var(--space-2);
    max-width: var(--content-max-width);
    margin: 0 auto;
    padding: calc(var(--space-2) + var(--space-1)) var(--space-4);
    overflow-x: auto;
  }

  a {
    flex: 0 0 auto;
    padding: var(--space-2) calc(var(--space-2) + var(--space-1));
    border-radius: var(--radius-md);
    color: var(--color-interactive);
    text-decoration: none;
  }

  a:hover,
  a:focus-visible {
    background: var(--color-interactive-subtle);
  }

  a.router-link-exact-active {
    background: var(--color-interactive);
    color: var(--color-interactive-contrast);
  }
}
</style>
