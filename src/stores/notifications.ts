import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'

export type NotificationKind = 'success' | 'error'

export interface AppNotification {
  id: number
  kind: NotificationKind
  message: string
}

const SUCCESS_DURATION_MS = 8_000

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([])
  const dismissTimers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextId = 1

  function dismissNotification(id: number): void {
    const timer = dismissTimers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      dismissTimers.delete(id)
    }

    notifications.value = notifications.value.filter((notification) => notification.id !== id)
  }

  function addNotification(kind: NotificationKind, message: string): number {
    const id = nextId++
    notifications.value.push({ id, kind, message })

    if (kind === 'success') {
      dismissTimers.set(
        id,
        setTimeout(() => dismissNotification(id), SUCCESS_DURATION_MS),
      )
    }

    return id
  }

  function notifySuccess(message: string): number {
    return addNotification('success', message)
  }

  function notifyError(message: string): number {
    return addNotification('error', message)
  }

  onScopeDispose(() => {
    for (const timer of dismissTimers.values()) clearTimeout(timer)
    dismissTimers.clear()
  })

  return { notifications, notifySuccess, notifyError, dismissNotification }
})
