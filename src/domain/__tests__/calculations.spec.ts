import { describe, expect, it } from 'vitest'
import {
  calculateActualObligationPaymentsTotal,
  calculateActualPaidByObligation,
  calculateBudgetSummary,
  calculateFreeExpensesTotal,
  calculateObligationVariance,
  calculatePlannedIncome,
  calculatePlannedObligationTotal,
  calculateReceivedIncome,
  calculateRemainingReserve,
} from '../calculations'
import type {
  FreeExpense,
  Income,
  IncomeStatus,
  MoneyMinorUnits,
  ObligationPayment,
  OpenMonthlyObligation,
  SettledMonthlyObligation,
} from '../models'

const MONTH_ID = 'month-2026-09'
const CREATED_AT = '2026-09-01T08:00:00.000Z'

function createIncome(id: string, amount: MoneyMinorUnits, status: IncomeStatus): Income {
  const commonFields = {
    id,
    monthId: MONTH_ID,
    title: `Доход ${id}`,
    amount,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }

  if (status === 'received') {
    return {
      ...commonFields,
      status,
      receivedAt: CREATED_AT,
    }
  }

  return {
    ...commonFields,
    status,
    receivedAt: null,
  }
}

function createOpenObligation(id: string, plannedAmount: MoneyMinorUnits): OpenMonthlyObligation {
  return {
    id,
    monthId: MONTH_ID,
    templateId: null,
    title: `Обязательство ${id}`,
    plannedAmount,
    isSettled: false,
    settledAt: null,
    sortOrder: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }
}

function createSettledObligation(
  id: string,
  plannedAmount: MoneyMinorUnits,
): SettledMonthlyObligation {
  return {
    id,
    monthId: MONTH_ID,
    templateId: null,
    title: `Обязательство ${id}`,
    plannedAmount,
    isSettled: true,
    settledAt: CREATED_AT,
    sortOrder: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }
}

function createPayment(
  id: string,
  obligationId: string,
  amount: MoneyMinorUnits,
): ObligationPayment {
  return {
    id,
    monthId: MONTH_ID,
    obligationId,
    amount,
    paidAt: '2026-09-05',
    note: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }
}

function createFreeExpense(id: string, amount: MoneyMinorUnits): FreeExpense {
  return {
    id,
    monthId: MONTH_ID,
    title: `Свободный расход ${id}`,
    amount,
    spentAt: '2026-09-06',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }
}

describe('income calculations', () => {
  it('separates planned income from received income', () => {
    // Arrange
    const incomes = [
      createIncome('salary', 8_000_000, 'received'),
      createIncome('bonus', 2_000_000, 'planned'),
    ]

    // Act
    const plannedIncome = calculatePlannedIncome(incomes)
    const receivedIncome = calculateReceivedIncome(incomes)

    // Assert
    expect(plannedIncome).toBe(10_000_000)
    expect(receivedIncome).toBe(8_000_000)
  })

  it('rejects a total outside the safe integer range', () => {
    const incomes = [
      createIncome('first', Number.MAX_SAFE_INTEGER, 'received'),
      createIncome('second', 1, 'received'),
    ]

    expect(() => calculatePlannedIncome(incomes)).toThrow(/безопасный диапазон/)
  })
})

describe('obligation calculations', () => {
  it('calculates planned and actual totals independently', () => {
    const obligations = [
      createOpenObligation('rent', 4_000_000),
      createOpenObligation('utilities', 1_000_000),
    ]
    const payments = [
      createPayment('rent-payment', 'rent', 4_000_000),
      createPayment('utilities-payment', 'utilities', 600_000),
    ]

    expect(calculatePlannedObligationTotal(obligations)).toBe(5_000_000)
    expect(calculateActualObligationPaymentsTotal(payments)).toBe(4_600_000)
    expect(calculateActualPaidByObligation('utilities', payments)).toBe(600_000)
  })

  it('reserves the full plan for an open obligation without payments', () => {
    const obligation = createOpenObligation('utilities', 1_000_000)

    expect(calculateRemainingReserve(obligation, [])).toBe(1_000_000)
    expect(calculateObligationVariance(obligation, [])).toBe(-1_000_000)
  })

  it('reduces the reserve after partial payments', () => {
    const obligation = createOpenObligation('utilities', 1_000_000)
    const payments = [
      createPayment('first', obligation.id, 300_000),
      createPayment('second', obligation.id, 300_000),
    ]

    expect(calculateActualPaidByObligation(obligation.id, payments)).toBe(600_000)
    expect(calculateRemainingReserve(obligation, payments)).toBe(400_000)
  })

  it('reports overspend and never creates a negative reserve', () => {
    const obligation = createOpenObligation('utilities', 1_000_000)
    const payments = [createPayment('payment', obligation.id, 1_100_000)]

    expect(calculateObligationVariance(obligation, payments)).toBe(100_000)
    expect(calculateRemainingReserve(obligation, payments)).toBe(0)
  })

  it('releases the unused reserve only while the obligation is settled', () => {
    const openObligation = createOpenObligation('utilities', 1_000_000)
    const settledObligation = createSettledObligation('utilities', 1_000_000)
    const payments = [createPayment('payment', 'utilities', 700_000)]

    expect(calculateRemainingReserve(settledObligation, payments)).toBe(0)
    expect(calculateRemainingReserve(openObligation, payments)).toBe(300_000)
  })
})

describe('free expense calculations', () => {
  it('sums several free expenses', () => {
    const expenses = [
      createFreeExpense('cafe', 300_000),
      createFreeExpense('taxi', 150_000),
      createFreeExpense('cinema', 50_000),
    ]

    expect(calculateFreeExpensesTotal(expenses)).toBe(500_000)
  })
})

describe('budget summary', () => {
  it('returns zero values for an empty budget', () => {
    expect(
      calculateBudgetSummary({
        incomes: [],
        obligations: [],
        payments: [],
        freeExpenses: [],
      }),
    ).toEqual({
      plannedIncome: 0,
      receivedIncome: 0,
      plannedObligationTotal: 0,
      actualObligationPaymentsTotal: 0,
      remainingReserve: 0,
      settledSavingsTotal: 0,
      overspendTotal: 0,
      freeExpensesTotal: 0,
      plannedFreeBalance: 0,
      actualBalance: 0,
      safeToSpend: 0,
    })
  })

  it('keeps safe to spend unchanged after a partial payment below plan', () => {
    const incomes = [createIncome('salary', 8_000_000, 'received')]
    const obligations = [createOpenObligation('utilities', 1_000_000)]

    const beforePayment = calculateBudgetSummary({
      incomes,
      obligations,
      payments: [],
      freeExpenses: [],
    })
    const afterPayment = calculateBudgetSummary({
      incomes,
      obligations,
      payments: [createPayment('payment', 'utilities', 600_000)],
      freeExpenses: [],
    })

    expect(beforePayment.actualBalance).toBe(8_000_000)
    expect(beforePayment.remainingReserve).toBe(1_000_000)
    expect(beforePayment.safeToSpend).toBe(7_000_000)
    expect(afterPayment.actualBalance).toBe(7_400_000)
    expect(afterPayment.remainingReserve).toBe(400_000)
    expect(afterPayment.safeToSpend).toBe(beforePayment.safeToSpend)
  })

  it('subtracts an overspend from safe to spend', () => {
    const summary = calculateBudgetSummary({
      incomes: [createIncome('salary', 8_000_000, 'received')],
      obligations: [createOpenObligation('utilities', 1_000_000)],
      payments: [createPayment('payment', 'utilities', 1_100_000)],
      freeExpenses: [],
    })

    expect(summary.actualBalance).toBe(6_900_000)
    expect(summary.remainingReserve).toBe(0)
    expect(summary.overspendTotal).toBe(100_000)
    expect(summary.safeToSpend).toBe(6_900_000)
  })

  it('releases savings when an obligation is settled below plan', () => {
    const summary = calculateBudgetSummary({
      incomes: [createIncome('salary', 8_000_000, 'received')],
      obligations: [createSettledObligation('utilities', 1_000_000)],
      payments: [createPayment('payment', 'utilities', 700_000)],
      freeExpenses: [],
    })

    expect(summary.actualBalance).toBe(7_300_000)
    expect(summary.remainingReserve).toBe(0)
    expect(summary.settledSavingsTotal).toBe(300_000)
    expect(summary.safeToSpend).toBe(7_300_000)
  })

  it.each([
    ['positive', 1_000_000, 0, 1_000_000],
    ['zero', 1_000_000, 1_000_000, 0],
    ['negative', 1_000_000, 1_200_000, -200_000],
  ])('supports a %s safe-to-spend value', (_caseName, incomeAmount, expenseAmount, expected) => {
    const freeExpenses = expenseAmount === 0 ? [] : [createFreeExpense('expense', expenseAmount)]
    const summary = calculateBudgetSummary({
      incomes: [createIncome('income', incomeAmount, 'received')],
      obligations: [],
      payments: [],
      freeExpenses,
    })

    expect(summary.safeToSpend).toBe(expected)
  })
})
