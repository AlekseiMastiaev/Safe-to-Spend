import type {
  BudgetSummary,
  EntityId,
  FreeExpense,
  Income,
  MoneyMinorUnits,
  MonthlyObligation,
  ObligationPayment,
} from './models'

export interface BudgetCalculationInput {
  incomes: readonly Income[]
  obligations: readonly MonthlyObligation[]
  payments: readonly ObligationPayment[]
  freeExpenses: readonly FreeExpense[]
}

function addMoney(left: MoneyMinorUnits, right: MoneyMinorUnits): MoneyMinorUnits {
  const result = left + right

  if (!Number.isSafeInteger(result)) {
    throw new Error('Результат денежного расчёта вышел за безопасный диапазон')
  }

  return result
}

function subtractMoney(left: MoneyMinorUnits, right: MoneyMinorUnits): MoneyMinorUnits {
  return addMoney(left, -right)
}

function sumMoney(amounts: readonly MoneyMinorUnits[]): MoneyMinorUnits {
  return amounts.reduce((total, amount) => addMoney(total, amount), 0)
}

export function calculatePlannedIncome(incomes: readonly Income[]): MoneyMinorUnits {
  return sumMoney(incomes.map((income) => income.amount))
}

export function calculateReceivedIncome(incomes: readonly Income[]): MoneyMinorUnits {
  return sumMoney(
    incomes.filter((income) => income.status === 'received').map((income) => income.amount),
  )
}

export function calculatePlannedObligationTotal(
  obligations: readonly MonthlyObligation[],
): MoneyMinorUnits {
  return sumMoney(obligations.map((obligation) => obligation.plannedAmount))
}

export function calculateActualPaidByObligation(
  obligationId: EntityId,
  payments: readonly ObligationPayment[],
): MoneyMinorUnits {
  return sumMoney(
    payments
      .filter((payment) => payment.obligationId === obligationId)
      .map((payment) => payment.amount),
  )
}

export function calculateActualObligationPaymentsTotal(
  payments: readonly ObligationPayment[],
): MoneyMinorUnits {
  return sumMoney(payments.map((payment) => payment.amount))
}

export function calculateRemainingReserve(
  obligation: MonthlyObligation,
  payments: readonly ObligationPayment[],
): MoneyMinorUnits {
  if (obligation.isSettled) {
    return 0
  }

  const actualPaid = calculateActualPaidByObligation(obligation.id, payments)

  return Math.max(subtractMoney(obligation.plannedAmount, actualPaid), 0)
}

export function calculateObligationVariance(
  obligation: MonthlyObligation,
  payments: readonly ObligationPayment[],
): MoneyMinorUnits {
  const actualPaid = calculateActualPaidByObligation(obligation.id, payments)

  return subtractMoney(actualPaid, obligation.plannedAmount)
}

export function calculateFreeExpensesTotal(freeExpenses: readonly FreeExpense[]): MoneyMinorUnits {
  return sumMoney(freeExpenses.map((expense) => expense.amount))
}

export function calculateBudgetSummary({
  incomes,
  obligations,
  payments,
  freeExpenses,
}: BudgetCalculationInput): BudgetSummary {
  const plannedIncome = calculatePlannedIncome(incomes)
  const receivedIncome = calculateReceivedIncome(incomes)
  const plannedObligationTotal = calculatePlannedObligationTotal(obligations)
  const actualObligationPaymentsTotal = calculateActualObligationPaymentsTotal(payments)
  const remainingReserve = sumMoney(
    obligations.map((obligation) => calculateRemainingReserve(obligation, payments)),
  )
  const freeExpensesTotal = calculateFreeExpensesTotal(freeExpenses)

  const { settledSavingsTotal, overspendTotal } = obligations.reduce(
    (totals, obligation) => {
      const variance = calculateObligationVariance(obligation, payments)
      const settledSavings = obligation.isSettled && variance < 0 ? -variance : 0
      const overspend = Math.max(variance, 0)

      return {
        settledSavingsTotal: addMoney(totals.settledSavingsTotal, settledSavings),
        overspendTotal: addMoney(totals.overspendTotal, overspend),
      }
    },
    { settledSavingsTotal: 0, overspendTotal: 0 },
  )

  const plannedFreeBalance = subtractMoney(
    subtractMoney(plannedIncome, plannedObligationTotal),
    freeExpensesTotal,
  )
  const actualBalance = subtractMoney(
    subtractMoney(receivedIncome, actualObligationPaymentsTotal),
    freeExpensesTotal,
  )
  const safeToSpend = subtractMoney(actualBalance, remainingReserve)

  return {
    plannedIncome,
    receivedIncome,
    plannedObligationTotal,
    actualObligationPaymentsTotal,
    remainingReserve,
    settledSavingsTotal,
    overspendTotal,
    freeExpensesTotal,
    plannedFreeBalance,
    actualBalance,
    safeToSpend,
  }
}
