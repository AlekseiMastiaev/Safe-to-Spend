import 'fake-indexeddb/auto'

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import router from '@/router'
import { APP_ROUTE_NAMES } from '@/router/navigation'
import { getCurrentMonthKey } from '@/domain/month'
import { db } from '@/shared/db/database'
import { DexieOnboardingRepository } from '@/shared/db/onboarding'
import { DexieMonthRepository } from '@/shared/db/repositories'
import { useSelectedMonthStore } from '@/stores/selectedMonth'
import { invalidateData } from '@/composables/useDataQuery'

describe('first-run UI', () => {
  const currentMonthKey = getCurrentMonthKey()

  beforeEach(async () => {
    await db.open()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    db.close()
    await Dexie.delete(db.name)
  })

  it('offers one month, persists defaults, then shows the dashboard after reloading', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(APP_ROUTE_NAMES.onboarding))
    expect(wrapper.text()).toContain('Создать бюджетный месяц')
    expect(await db.budgetMonths.count()).toBe(0)

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(APP_ROUTE_NAMES.dashboard))
    await vi.waitFor(() => expect(wrapper.text()).toContain(`Бюджет за ${currentMonthKey}`))
    expect(await db.budgetMonths.count()).toBe(1)
    expect(await db.settings.get('app-settings')).toMatchObject({
      currency: 'RUB',
      locale: 'ru-RU',
      colorScheme: 'system',
    })
    expect(useSelectedMonthStore(pinia).selectedMonthKey).not.toBeNull()
    wrapper.unmount()

    await router.push('/onboarding')
    const reopened = mount(App, { global: { plugins: [pinia, router] } })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(APP_ROUTE_NAMES.dashboard))
    expect(await db.budgetMonths.count()).toBe(1)
    reopened.unmount()
  })

  it('shows a failed save and allows another attempt without a partial month', async () => {
    expect(await db.budgetMonths.count()).toBe(0)
    const pinia = createPinia()
    setActivePinia(pinia)
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(APP_ROUTE_NAMES.onboarding))
    const failedStart = vi
      .spyOn(DexieOnboardingRepository.prototype, 'initialize')
      .mockRejectedValueOnce(new Error('storage unavailable'))

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.get('[role="alert"]').text()).toContain('Не удалось завершить первый запуск'),
    )
    expect(await db.budgetMonths.count()).toBe(0)
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()

    failedStart.mockRestore()
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(APP_ROUTE_NAMES.dashboard))
    expect(await db.budgetMonths.count()).toBe(1)
    wrapper.unmount()
  })

  it('reports a storage read error instead of treating it as an empty budget', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    await router.push('/')
    await router.isReady()
    vi.spyOn(DexieMonthRepository.prototype, 'list').mockRejectedValue(
      new Error('storage unavailable'),
    )

    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await vi.waitFor(() =>
      expect(wrapper.get('main[role="alert"]').text()).toContain('Не удалось прочитать'),
    )
    expect(router.currentRoute.value.name).toBe(APP_ROUTE_NAMES.dashboard)
    expect(await db.budgetMonths.count()).toBe(0)
    wrapper.unmount()
  })

  it('preserves an income draft through refresh, resume, and a background read error', async () => {
    await new DexieOnboardingRepository(db).initialize(currentMonthKey)
    const pinia = createPinia()
    setActivePinia(pinia)
    await router.push({ name: APP_ROUTE_NAMES.incomes })
    await router.isReady()
    const wrapper = mount(App, {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Доходов пока нет'))
    const open = wrapper.findAll('button').find((button) => button.text() === '+ Добавить доход')!
    await open.trigger('click')
    const input = document.querySelector<HTMLInputElement>('dialog input')!
    input.value = '12345'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    invalidateData()
    await flushPromises()
    expect(document.querySelector('dialog input')).toBe(input)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    const read = vi
      .spyOn(DexieMonthRepository.prototype, 'list')
      .mockRejectedValueOnce(new Error('offline'))
    invalidateData()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Не удалось обновить данные'))
    expect(input.value).toBe('12345')
    expect(document.querySelector('dialog input')).toBe(input)
    read.mockRestore()
    invalidateData()
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Не удалось обновить данные'))
    wrapper.unmount()
  })
})
