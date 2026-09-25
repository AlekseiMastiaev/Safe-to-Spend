import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '../notifications'

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    useNotificationStore().$dispose()
    vi.useRealTimers()
  })

  it('queues a success message and dismisses it automatically', () => {
    const store = useNotificationStore()
    const id = store.notifySuccess('Платёж сохранён')

    expect(store.notifications).toEqual([{ id, kind: 'success', message: 'Платёж сохранён' }])

    vi.advanceTimersByTime(7_999)
    expect(store.notifications).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(store.notifications).toEqual([])
  })

  it('keeps an error visible until it is dismissed manually', () => {
    const store = useNotificationStore()
    const id = store.notifyError('Не удалось сохранить платёж')

    vi.advanceTimersByTime(60_000)
    expect(store.notifications).toEqual([
      { id, kind: 'error', message: 'Не удалось сохранить платёж' },
    ])

    store.dismissNotification(id)
    expect(store.notifications).toEqual([])
  })

  it('removes only the selected message and cancels its timer', () => {
    const store = useNotificationStore()
    const firstId = store.notifySuccess('Первое действие выполнено')
    const secondId = store.notifySuccess('Второе действие выполнено')

    store.dismissNotification(firstId)

    expect(store.notifications.map((notification) => notification.id)).toEqual([secondId])
    expect(vi.getTimerCount()).toBe(1)
  })

  it('clears active timers when the store is disposed', () => {
    const store = useNotificationStore()
    store.notifySuccess('Готово')

    store.$dispose()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts with an empty queue in a new Pinia instance', () => {
    const previousStore = useNotificationStore()
    previousStore.notifyError('Старая ошибка')

    setActivePinia(createPinia())

    expect(useNotificationStore().notifications).toEqual([])
    previousStore.$dispose()
  })
})
