import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import router from '@/router'
import { APP_ROUTE_NAMES } from '@/router/navigation'
import { db } from '@/shared/db/database'
import { DexieOnboardingRepository } from '@/shared/db/onboarding'
import { DexieMonthRepository } from '@/shared/db/repositories'
import { useSelectedMonthStore } from '@/stores/selectedMonth'

describe('first-run UI', () => {
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
    await vi.waitFor(() => expect(wrapper.text()).toContain('Бюджет за 2026-09'))
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
})
