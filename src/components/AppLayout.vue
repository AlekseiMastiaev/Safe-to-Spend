<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppNavigation from '@/components/AppNavigation.vue'
import MobileBottomNavigation from '@/components/MobileBottomNavigation.vue'
import { navigationItems } from '@/router/navigation'
</script>

<template>
  <div class="app-shell">
    <AppHeader title="Safe to Spend" />
    <AppNavigation :items="navigationItems" />

    <main class="app-main">
      <RouterView />
    </main>

    <MobileBottomNavigation :items="navigationItems" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-main {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--space-4) var(--space-4)
    calc(var(--mobile-navigation-height) + var(--space-4) + env(safe-area-inset-bottom));
}

@media (min-width: 48rem) {
  .app-main {
    padding-bottom: var(--space-4);
  }
}
</style>
