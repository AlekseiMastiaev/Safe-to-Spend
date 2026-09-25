import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  BudgetMonth,
  FreeExpense,
  Income,
  MonthlyObligation,
  ObligationPayment,
} from '@/domain/models'
import { db } from '@/shared/db/database'
import { useSelectedMonthStore } from '@/stores/selectedMonth'
import DashboardPage from '@/views/DashboardPage.vue'
import PaymentProgress from '../dashboard/PaymentProgress.vue'

describe('DashboardPage', () => {
  const timestamp = '2026-09-01T08:00:00.000Z'
  const month: BudgetMonth = {
    id: 'month',
    monthKey: '2026-09',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  beforeEach(async () => {
    await db.open()
    const incomes: Income[] = [
      {
        id: 'received',
        monthId: month.id,
        title: 'Зарплата',
        amount: 8_000_000,
        status: 'received',
        receivedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'planned',
        monthId: month.id,
        title: 'Ожидаемый доход',
        amount: 2_000_000,
        status: 'planned',
        receivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]
    const obligation: MonthlyObligation = {
      id: 'utilities',
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
    const payment: ObligationPayment = {
      id: 'payment',
      monthId: month.id,
      obligationId: obligation.id,
      amount: 600_000,
      paidAt: '2026-09-05',
      note: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const expense: FreeExpense = {
      id: 'expense',
      monthId: month.id,
      title: 'Свободные траты',
      amount: 1_250_000,
      spentAt: '2026-09-06',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.budgetMonths.add(month)
    await db.incomes.bulkAdd(incomes)
    await db.monthlyObligations.add(obligation)
    await db.obligationPayments.add(payment)
    await db.freeExpenses.add(expense)
  })

  afterEach(async () => {
    db.close()
    await Dexie.delete(db.name)
  })

  it('shows a calculated summary from persisted month data', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSelectedMonthStore(pinia).setSelectedMonthKey(month.monthKey)
    const wrapper = mount(DashboardPage, { global: { plugins: [pinia] } })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Бюджет за 2026-09'))
    const text = wrapper.text().replace(/[\u00a0\u202f]/g, ' ')

    expect(text).toContain('57 500 ₽')
    expect(text).toContain('61 500 ₽')
    expect(text).toContain('4 000 ₽')
    expect(text).toContain('Частично оплачен')
    expect(text).toContain('Оплачено: 6 000 ₽ · План: 10 000 ₽')
    expect(wrapper.get('progress').attributes('value')).toBe('60')
    wrapper.unmount()
  })
})

describe('PaymentProgress', () => {
  it('caps the visual progress at 100% after an overspend', () => {
    const wrapper = mount(PaymentProgress, {
      props: {
        title: 'Коммунальные услуги',
        plannedAmount: 1_000_000,
        actualPaid: 1_100_000,
        remainingReserve: 0,
        isSettled: false,
      },
    })

    expect(wrapper.get('progress').attributes('value')).toBe('100')
    expect(wrapper.text().replace(/[\u00a0\u202f]/g, ' ')).toContain(
      'Оплачено: 11 000 ₽ · План: 10 000 ₽',
    )
  })
})
