<script setup lang="ts">
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/notifications'

const notificationStore = useNotificationStore()
const successNotifications = computed(() =>
  notificationStore.notifications.filter((notification) => notification.kind === 'success'),
)
const errorNotifications = computed(() =>
  notificationStore.notifications.filter((notification) => notification.kind === 'error'),
)
</script>

<template>
  <div class="notification-host">
    <div class="visually-hidden" role="status" aria-atomic="false" aria-relevant="additions">
      <p v-for="notification in successNotifications" :key="notification.id">
        Успешно: {{ notification.message }}
      </p>
    </div>
    <div class="visually-hidden" role="alert" aria-atomic="false" aria-relevant="additions">
      <p v-for="notification in errorNotifications" :key="notification.id">
        Ошибка: {{ notification.message }}
      </p>
    </div>

    <div
      v-for="notification in notificationStore.notifications"
      :key="notification.id"
      class="toast"
      :class="`toast--${notification.kind}`"
    >
      <div class="toast-content">
        <strong>{{ notification.kind === 'success' ? 'Успешно' : 'Ошибка' }}</strong>
        <p>{{ notification.message }}</p>
      </div>
      <button
        type="button"
        :aria-label="`Закрыть уведомление: ${notification.message}`"
        @click="notificationStore.dismissNotification(notification.id)"
      >
        Закрыть
      </button>
    </div>
  </div>
</template>

<style scoped>
.notification-host {
  position: fixed;
  z-index: 20;
  top: var(--space-3);
  right: var(--space-3);
  left: var(--space-3);
  display: grid;
  gap: var(--space-2);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-left: 0.25rem solid var(--color-positive);
  border-radius: var(--radius-md);
  color: var(--color-text);
  background: var(--color-surface);
  box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 0.16);
  pointer-events: auto;
}

.toast--error {
  border-left-color: var(--color-negative);
}

.toast-content {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.toast-content p {
  margin: var(--space-1) 0 0;
}

.toast button {
  padding: var(--space-1);
  border: 0;
  color: var(--color-interactive);
  background: transparent;
  cursor: pointer;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (min-width: 40rem) {
  .notification-host {
    left: auto;
    width: min(24rem, calc(100vw - 2 * var(--space-3)));
  }
}
</style>
