import { readMonthWithCarryover } from '@/domain/carryover'
import type { BudgetHistory, MonthBudget, MonthKey } from '@/domain/models'
import type { BudgetReadRepository } from '@/domain/repositories'
import type { SafeToSpendDatabase } from './database'

export class DexieBudgetReadRepository implements BudgetReadRepository {
  constructor(private readonly database: SafeToSpendDatabase) {}

  async readMonth(monthKey: MonthKey, currentMonthKey: MonthKey): Promise<MonthBudget> {
    const history = await this.database.transaction(
      'r',
      [
        this.database.budgetMonths,
        this.database.incomes,
        this.database.monthlyObligations,
        this.database.obligationPayments,
        this.database.freeExpenses,
      ],
      async (): Promise<BudgetHistory> => {
        const budgetMonths = await this.database.budgetMonths
          .where('monthKey')
          .belowOrEqual(monthKey)
          .toArray()
        const ids = budgetMonths.map((month) => month.id)
        const [incomes, monthlyObligations, obligationPayments, freeExpenses] = await Promise.all([
          this.database.incomes.where('monthId').anyOf(ids).toArray(),
          this.database.monthlyObligations.where('monthId').anyOf(ids).toArray(),
          this.database.obligationPayments.where('monthId').anyOf(ids).toArray(),
          this.database.freeExpenses.where('monthId').anyOf(ids).toArray(),
        ])
        incomes.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        return { budgetMonths, incomes, monthlyObligations, obligationPayments, freeExpenses }
      },
    )
    return readMonthWithCarryover(history, monthKey, currentMonthKey)
  }
}
