<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppNavigation from '@/components/AppNavigation.vue'
import AppNotificationHost from '@/components/AppNotificationHost.vue'
import MobileBottomNavigation from '@/components/MobileBottomNavigation.vue'
import { navigationItems } from '@/router/navigation'
import { useAuthStore } from '@/stores/auth'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

const auth = useAuthStore()
const selectedMonth = useSelectedMonthStore()
</script>

<template>
  <div class="app-shell">
    <AppHeader title="Safe to Spend" />
    <AppNavigation :items="navigationItems" />

    <main class="app-main">
      <RouterView :key="`${auth.userId ?? 'local'}:${selectedMonth.selectedMonthKey}`" />
    </main>

    <MobileBottomNavigation :items="navigationItems" />
    <AppNotificationHost />
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
