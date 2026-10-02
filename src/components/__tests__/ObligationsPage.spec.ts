import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BudgetMonth, MonthlyObligation } from '@/domain/models'
import { db } from '@/shared/db/database'
import { useSelectedMonthStore } from '@/stores/selectedMonth'
import ObligationsPage from '@/views/ObligationsPage.vue'
import ObligationList from '../obligations/ObligationList.vue'
import ObligationProgress from '../obligations/ObligationProgress.vue'
import { createObligationPreview } from '../obligations/preview'

function normalizeSpaces(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ')
}

describe('ObligationsPage interface', () => {
  const timestamp = '2026-09-01T08:00:00.000Z'
  const month: BudgetMonth = {
    id: 'month',
    monthKey: '2026-09',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const openObligation: MonthlyObligation = {
    id: 'open',
    monthId: month.id,
    templateId: null,
    title: 'Коммунальные услуги',
    plannedAmount: 1_000_000,
    sortOrder: 0,
    isSettled: false,
    settledAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const settledObligation: MonthlyObligation = {
    ...openObligation,
    id: 'settled',
    title: 'Страховка',
    sortOrder: 1,
    isSettled: true,
    settledAt: timestamp,
  }

  beforeEach(async () => {
    await db.open()
    await db.budgetMonths.add(month)
    await db.monthlyObligations.bulkAdd([openObligation, settledObligation])
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(db.name)
  })

  it('separates closed expenses and opens creation in a modal', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSelectedMonthStore(pinia).setSelectedMonthKey(month.monthKey)
    const wrapper = mount(ObligationsPage, {
      global: { plugins: [pinia], stubs: { Teleport: true } },
    })

    await vi.waitFor(() => expect(wrapper.text()).toContain('Коммунальные услуги'))
    expect(wrapper.get('.obligation-group').text()).not.toContain('Страховка')
    expect(wrapper.get('.settled-obligations').text()).toContain('Страховка')
    expect(wrapper.get('.settled-obligations').attributes('open')).toBeUndefined()

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('dialog').attributes('aria-labelledby')).toBeTruthy()
    expect(wrapper.get('dialog').text()).toContain('Новый обязательный расход')
    wrapper.unmount()
  })
})

describe('ObligationList', () => {
  it('shows an empty state when there are no obligations', () => {
    const wrapper = mount(ObligationList, { props: { previews: [] } })

    expect(wrapper.text()).toContain('Обязательных расходов пока нет')
  })
})

describe('ObligationProgress', () => {
  it('caps visual progress at 100% after an overspend', () => {
    const wrapper = mount(ObligationProgress, {
      props: {
        title: 'Ремонт',
        plannedAmount: 1_000_000,
        actualPaid: 1_100_000,
        remainingReserve: 0,
      },
    })

    expect(wrapper.get('progress').attributes('value')).toBe('100')
    expect(normalizeSpaces(wrapper.text())).toContain('11 000 ₽')
  })
})

describe('createObligationPreview', () => {
  it('does not call an unused reserve savings until an obligation is settled', () => {
    const obligation: MonthlyObligation = {
      id: 'test',
      monthId: 'month',
      templateId: null,
      title: 'Счёт',
      plannedAmount: 1_000_000,
      sortOrder: 0,
      isSettled: false,
      settledAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    }
    const payment = {
      id: 'payment',
      monthId: 'month',
      obligationId: 'test',
      amount: 700_000,
      paidAt: '2026-09-02',
      note: null,
      createdAt: obligation.createdAt,
      updatedAt: obligation.updatedAt,
    }

    expect(createObligationPreview(obligation, [payment])).toMatchObject({
      actualPaid: 700_000,
      remainingReserve: 300_000,
      savings: 0,
      overspend: 0,
    })
    expect(
      createObligationPreview(
        { ...obligation, isSettled: true, settledAt: '2026-09-03T00:00:00.000Z' },
        [payment],
      ),
    ).toMatchObject({ remainingReserve: 0, savings: 300_000 })
  })
})
