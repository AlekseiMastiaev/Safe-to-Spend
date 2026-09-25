import type {
  BudgetMonth,
  EntityId,
  FreeExpense,
  Income,
  MonthKey,
  MonthlyObligation,
  ObligationPayment,
} from '@/domain/models'
import type {
  MonthRepository,
  FreeExpenseRepository,
  IncomeRepository,
  ObligationPaymentRepository,
  ObligationRepository,
} from '@/domain/repositories'
import type { SafeToSpendDatabase } from './database'

export class DexieMonthRepository implements MonthRepository {
  constructor(private readonly database: SafeToSpendDatabase) {}

  findById(id: EntityId): Promise<BudgetMonth | undefined> {
    return this.database.budgetMonths.get(id)
  }

  findByMonthKey(monthKey: MonthKey): Promise<BudgetMonth | undefined> {
    return this.database.budgetMonths.where('monthKey').equals(monthKey).first()
  }

  list(): Promise<BudgetMonth[]> {
    return this.database.budgetMonths.orderBy('monthKey').toArray()
  }

  async save(month: BudgetMonth): Promise<void> {
    await this.database.budgetMonths.put(month)
  }
}

export class DexieIncomeRepository implements IncomeRepository {
  constructor(private readonly database: SafeToSpendDatabase) {}

  findById(id: EntityId): Promise<Income | undefined> {
    return this.database.incomes.get(id)
  }

  async listByMonth(monthId: EntityId): Promise<Income[]> {
    const incomes = await this.database.incomes.where('monthId').equals(monthId).toArray()
    return incomes.sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )
  }

  async save(income: Income): Promise<void> {
    assertPositiveMoney(income.amount, 'Доход')
    assertTitle(income.title, 'Доход')
    assertIncomeState(income)

    await this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.incomes,
      async () => {
        if (!(await this.database.budgetMonths.get(income.monthId))) {
          throw new Error('Нельзя сохранить доход без бюджетного месяца')
        }
        const existing = await this.database.incomes.get(income.id)
        if (existing && existing.monthId !== income.monthId) {
          throw new Error('Нельзя перенести доход в другой месяц')
        }
        await this.database.incomes.put(income)
      },
    )
  }

  delete(id: EntityId): Promise<void> {
    return this.database.incomes.delete(id)
  }
}

export class DexieFreeExpenseRepository implements FreeExpenseRepository {
  constructor(private readonly database: SafeToSpendDatabase) {}

  findById(id: EntityId): Promise<FreeExpense | undefined> {
    return this.database.freeExpenses.get(id)
  }

  async listByMonth(monthId: EntityId): Promise<FreeExpense[]> {
    const expenses = await this.database.freeExpenses.where('monthId').equals(monthId).toArray()
    return expenses.sort((a, b) => b.spentAt.localeCompare(a.spentAt) || a.id.localeCompare(b.id))
  }

  async save(expense: FreeExpense): Promise<void> {
    assertPositiveMoney(expense.amount, 'Свободная трата')
    assertTitle(expense.title, 'Свободная трата')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expense.spentAt)) {
      throw new Error('Дата траты должна быть в формате ГГГГ-ММ-ДД')
    }

    await this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.freeExpenses,
      async () => {
        if (!(await this.database.budgetMonths.get(expense.monthId))) {
          throw new Error('Нельзя сохранить трату без бюджетного месяца')
        }
        const existing = await this.database.freeExpenses.get(expense.id)
        if (existing && existing.monthId !== expense.monthId) {
          throw new Error('Нельзя перенести трату в другой месяц')
        }
        await this.database.freeExpenses.put(expense)
      },
    )
  }

  delete(id: EntityId): Promise<void> {
    return this.database.freeExpenses.delete(id)
  }
}

export class DexieObligationRepository implements ObligationRepository {
  constructor(private readonly database: SafeToSpendDatabase) {}

  findById(id: EntityId): Promise<MonthlyObligation | undefined> {
    return this.database.monthlyObligations.get(id)
  }

  async listByMonth(monthId: EntityId): Promise<MonthlyObligation[]> {
    const obligations = await this.database.monthlyObligations
      .where('monthId')
      .equals(monthId)
      .toArray()

    return obligations.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
  }

  async save(obligation: MonthlyObligation): Promise<void> {
    assertPositiveMoney(obligation.plannedAmount, 'План обязательного расхода')
    assertTitle(obligation.title, 'Обязательный расход')
    await this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.monthlyObligations,
      async () => {
        if (!(await this.database.budgetMonths.get(obligation.monthId))) {
          throw new Error('Нельзя сохранить обязательство без бюджетного месяца')
        }
        const existing = await this.database.monthlyObligations.get(obligation.id)
        if (existing && existing.monthId !== obligation.monthId) {
          throw new Error('Нельзя перенести обязательство в другой месяц')
        }
        await this.database.monthlyObligations.put(obligation)
      },
    )
  }
}

export class DexieObligationPaymentRepository implements ObligationPaymentRepository {
  constructor(private readonly database: SafeToSpendDatabase) {}

  findById(id: EntityId): Promise<ObligationPayment | undefined> {
    return this.database.obligationPayments.get(id)
  }

  async listByMonth(monthId: EntityId): Promise<ObligationPayment[]> {
    const payments = await this.database.obligationPayments
      .where('monthId')
      .equals(monthId)
      .toArray()
    return sortPayments(payments)
  }

  async listByObligation(obligationId: EntityId): Promise<ObligationPayment[]> {
    const payments = await this.database.obligationPayments
      .where('obligationId')
      .equals(obligationId)
      .toArray()
    return sortPayments(payments)
  }

  async save(payment: ObligationPayment): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.monthlyObligations,
      this.database.obligationPayments,
      async () => {
        const obligation = await this.database.monthlyObligations.get(payment.obligationId)
        if (!obligation || obligation.monthId !== payment.monthId) {
          throw new Error('Платёж должен принадлежать существующему обязательству того же месяца')
        }
        if (!(await this.database.budgetMonths.get(payment.monthId))) {
          throw new Error('Нельзя сохранить платёж без бюджетного месяца')
        }
        const existing = await this.database.obligationPayments.get(payment.id)
        if (
          existing &&
          (existing.monthId !== payment.monthId || existing.obligationId !== payment.obligationId)
        ) {
          throw new Error('Нельзя перенести существующий платёж в другой расход или месяц')
        }
        if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0) {
          throw new Error('Платёж должен быть положительной суммой в копейках')
        }
        await this.database.obligationPayments.put(payment)
      },
    )
  }

  delete(id: EntityId): Promise<void> {
    return this.database.obligationPayments.delete(id)
  }
}

function sortPayments(payments: ObligationPayment[]): ObligationPayment[] {
  return payments.sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.id.localeCompare(b.id))
}

function assertPositiveMoney(amount: number, label: string): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${label} должен быть положительной суммой в копейках`)
  }
}

function assertTitle(title: string, label: string): void {
  if (title.trim().length === 0) throw new Error(`${label}: укажите название`)
}

function assertIncomeState(income: Income): void {
  if (income.status === 'planned' && income.receivedAt !== null) {
    throw new Error('У запланированного дохода не должно быть даты получения')
  }
  if (income.status === 'received' && income.receivedAt.length === 0) {
    throw new Error('У полученного дохода должна быть дата получения')
  }
}
