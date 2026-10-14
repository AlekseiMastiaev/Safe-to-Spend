// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readMonthWithCarryover } from '../carryover'
import { calculateBudgetSummary } from '../calculations'
import { getMonthStartIsoDateTime } from '../month'
import type { BudgetHistory, BudgetMonth, Income } from '../models'

const timestamp = '2026-09-01T08:00:00.000Z'
function month(monthKey: string): BudgetMonth {
  return { id: monthKey, monthKey, createdAt: timestamp, updatedAt: timestamp }
}
function income(monthId: string, amount: number, received = true): Income {
  const base = {
    id: `income:${monthId}`,
    monthId,
    title: 'Доход',
    amount,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  return received
    ? { ...base, status: 'received', receivedAt: timestamp }
    : { ...base, status: 'planned', receivedAt: null }
}
function history(): BudgetHistory {
  return {
    budgetMonths: [month('2026-09'), month('2026-10'), month('2026-11')],
    incomes: [
      income('2026-09', 10_000),
      income('2026-10', 5_000),
      income('2026-09', 20_000, false),
    ],
    monthlyObligations: [
      {
        id: 'reserve',
        monthId: '2026-09',
        templateId: null,
        title: 'Резерв',
        plannedAmount: 4_000,
        sortOrder: 0,
        isSettled: false,
        settledAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    obligationPayments: [
      {
        id: 'payment',
        monthId: '2026-09',
        obligationId: 'reserve',
        amount: 1_000,
        paidAt: '2026-09-05',
        note: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    freeExpenses: [
      {
        id: 'expense',
        monthId: '2026-09',
        title: 'Траты',
        amount: 2_000,
        spentAt: '2026-09-05',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  }
}

describe('month carryover', () => {
  it('carries received funds after spending and open reserves through the chain', () => {
    const source = history()
    const october = readMonthWithCarryover(source, '2026-10', '2026-11')
    expect(october.incomes[0]).toMatchObject({
      id: 'carryover:2026-10',
      kind: 'carryover',
      amount: 4_000,
      status: 'received',
      sourceMonthKey: '2026-09',
      receivedAt: getMonthStartIsoDateTime('2026-10'),
    })
    expect(calculateBudgetSummary(october).safeToSpend).toBe(9_000)
    expect(readMonthWithCarryover(source, '2026-11', '2026-11').incomes[0]?.amount).toBe(9_000)
    expect(source.incomes).toHaveLength(3)
  })

  it('recalculates later months after a past expense changes', () => {
    const original = history()
    const revised = { ...original, freeExpenses: [{ ...original.freeExpenses[0]!, amount: 5_000 }] }
    expect(readMonthWithCarryover(revised, '2026-11', '2026-11').incomes[0]?.amount).toBe(6_000)
  })

  it.each([6_000, 7_000])('does not create an income for zero or negative funds (%s)', (amount) => {
    const original = history()
    const revised = { ...original, freeExpenses: [{ ...original.freeExpenses[0]!, amount }] }
    const september = readMonthWithCarryover(revised, '2026-09', '2026-10')
    expect(calculateBudgetSummary(september).safeToSpend).toBe(6_000 - amount)
    expect(readMonthWithCarryover(revised, '2026-10', '2026-10').incomes).toHaveLength(1)
  })

  it('releases settled savings but still subtracts spending, and subtracts overspending', () => {
    const original = history()
    const settled: BudgetHistory = {
      ...original,
      monthlyObligations: [
        { ...original.monthlyObligations[0]!, isSettled: true, settledAt: timestamp },
      ],
    }
    expect(readMonthWithCarryover(settled, '2026-10', '2026-10').incomes[0]?.amount).toBe(7_000)
    const overspent = {
      ...original,
      obligationPayments: [{ ...original.obligationPayments[0]!, amount: 6_000 }],
    }
    expect(readMonthWithCarryover(overspent, '2026-10', '2026-10').incomes[0]?.amount).toBe(2_000)
  })

  it('supports a gap and December to January without premature future income', () => {
    const source: BudgetHistory = {
      ...history(),
      budgetMonths: [month('2026-12'), month('2027-02')],
      incomes: [income('2026-12', 10_000)],
      monthlyObligations: [],
      obligationPayments: [],
      freeExpenses: [],
    }
    expect(readMonthWithCarryover(source, '2027-02', '2027-01').incomes).toEqual([])
    expect(readMonthWithCarryover(source, '2027-02', '2027-02').incomes[0]).toMatchObject({
      amount: 10_000,
      sourceMonthKey: '2026-12',
    })
    const adjacent = { ...source, budgetMonths: [month('2026-12'), month('2027-01')] }
    expect(readMonthWithCarryover(adjacent, '2027-01', '2027-01').incomes[0]?.amount).toBe(10_000)
  })

  it('fails on missing months, invalid keys and unsafe sums instead of returning zero', () => {
    expect(() => readMonthWithCarryover(history(), '2026-08', '2026-11')).toThrow('не найден')
    expect(() => readMonthWithCarryover(history(), 'invalid', '2026-11')).toThrow('Некорректный')
    const unsafe = {
      ...history(),
      incomes: [
        income('2026-09', Number.MAX_SAFE_INTEGER),
        { ...income('2026-09', 1), id: 'extra' },
      ],
    }
    expect(() => readMonthWithCarryover(unsafe, '2026-10', '2026-10')).toThrow('диапазон')
  })
})
