import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import AppNotificationHost from '../AppNotificationHost.vue'
import { useNotificationStore } from '@/stores/notifications'

describe('AppNotificationHost', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces success politely and errors assertively', async () => {
    const pinia = createPinia()
    const wrapper = mount(AppNotificationHost, { global: { plugins: [pinia] } })
    const store = useNotificationStore(pinia)

    expect(wrapper.get('[role="status"]').text()).toBe('')
    expect(wrapper.get('[role="alert"]').text()).toBe('')

    store.notifySuccess('Месяц создан')
    store.notifyError('Не удалось сохранить платёж')
    await nextTick()

    expect(wrapper.get('[role="status"]').text()).toContain('Успешно: Месяц создан')
    expect(wrapper.get('[role="alert"]').text()).toContain('Ошибка: Не удалось сохранить платёж')
    expect(wrapper.findAll('.toast')).toHaveLength(2)

    wrapper.unmount()
    store.$dispose()
  })

  it('allows a message to be dismissed with a button', async () => {
    const pinia = createPinia()
    const wrapper = mount(AppNotificationHost, { global: { plugins: [pinia] } })
    const store = useNotificationStore(pinia)
    store.notifyError('Сбой сохранения')
    await nextTick()

    await wrapper.get('button[aria-label="Закрыть уведомление: Сбой сохранения"]').trigger('click')

    expect(store.notifications).toEqual([])
    expect(wrapper.findAll('.toast')).toHaveLength(0)

    wrapper.unmount()
    store.$dispose()
  })
})
