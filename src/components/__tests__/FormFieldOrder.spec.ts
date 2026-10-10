import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Component } from 'vue'
import type { BudgetMonth } from '@/domain/models'
import { db } from '@/shared/db/database'
import { useSelectedMonthStore } from '@/stores/selectedMonth'
import ExpensesPage from '@/views/ExpensesPage.vue'
import IncomesPage from '@/views/IncomesPage.vue'
import ObligationsPage from '@/views/ObligationsPage.vue'

describe('financial entity form field order', () => {
  const month: BudgetMonth = {
    id: 'month',
    monthKey: '2026-10',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  }

  beforeEach(async () => {
    await db.open()
    await db.budgetMonths.add(month)
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(db.name)
  })

  it.each([
    [IncomesPage, '+ Добавить доход', 'Сумма, ₽'],
    [ExpensesPage, '+ Добавить трату', 'Сумма, ₽'],
    [ObligationsPage, '+ Добавить обязательный расход', 'План, ₽'],
  ])('shows amount before title in %s', async (component, openLabel, amountLabel) => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSelectedMonthStore(pinia).setSelectedMonthKey(month.monthKey)
    const wrapper = mount(component as Component, {
      global: { plugins: [pinia], stubs: { Teleport: true } },
    })

    const openButton = wrapper.findAll('button').find((button) => button.text() === openLabel)
    expect(openButton).toBeDefined()
    await openButton!.trigger('click')

    const fieldLabels = wrapper
      .get('dialog')
      .findAll('.field > span')
      .map((label) => label.text())

    expect(fieldLabels.slice(0, 2)).toEqual([amountLabel, 'Название'])
    wrapper.unmount()
  })
})
