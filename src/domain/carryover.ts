import { calculateBudgetSummary } from './calculations'
import { getMonthStartIsoDateTime, isValidMonthKey } from './month'
import type { BudgetHistory, CarryoverIncome, MonthBudget, MonthKey } from './models'

/** Rebuild every opening balance from one snapshot of the underlying history. */
export function readMonthWithCarryover(
  history: BudgetHistory,
  monthKey: MonthKey,
  currentMonthKey: MonthKey,
): MonthBudget {
  if (!isValidMonthKey(monthKey) || !isValidMonthKey(currentMonthKey)) {
    throw new Error('Некорректный бюджетный месяц')
  }
  const months = history.budgetMonths
    .filter((month) => month.monthKey <= monthKey)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  const budgets = new Map<string, MonthBudget>(
    months.map((month) => [
      month.id,
      {
        month,
        incomes: [],
        obligations: [],
        payments: [],
        freeExpenses: [],
      },
    ]),
  )
  for (const income of history.incomes) budgets.get(income.monthId)?.incomes.push(income)
  for (const obligation of history.monthlyObligations) {
    budgets.get(obligation.monthId)?.obligations.push(obligation)
  }
  for (const payment of history.obligationPayments) {
    budgets.get(payment.monthId)?.payments.push(payment)
  }
  for (const expense of history.freeExpenses)
    budgets.get(expense.monthId)?.freeExpenses.push(expense)

  let previous: MonthBudget | null = null
  let previousSafeBalance = 0
  for (const month of months) {
    const budget = budgets.get(month.id)!
    const amount = Math.max(previousSafeBalance, 0)
    if (previous && month.monthKey <= currentMonthKey && amount > 0) {
      const receivedAt = getMonthStartIsoDateTime(month.monthKey)
      const carryover: CarryoverIncome = {
        id: `carryover:${month.id}`,
        kind: 'carryover',
        monthId: month.id,
        title: `Остаток за ${previous.month.monthKey}`,
        amount,
        status: 'received',
        receivedAt,
        createdAt: receivedAt,
        updatedAt: receivedAt,
        sourceMonthId: previous.month.id,
        sourceMonthKey: previous.month.monthKey,
      }
      budget.incomes.unshift(carryover)
    }
    previousSafeBalance = calculateBudgetSummary(budget).safeToSpend
    previous = budget
    if (month.monthKey === monthKey) return budget
  }
  throw new Error('Выбранный месяц не найден')
}
