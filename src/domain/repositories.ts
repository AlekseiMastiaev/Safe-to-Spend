import type {
  BudgetMonth,
  EntityId,
  FreeExpense,
  Income,
  IsoDate,
  MoneyMinorUnits,
  MonthKey,
  MonthlyObligation,
  ObligationPayment,
} from './models'

export interface MonthRepository {
  findById(id: EntityId): Promise<BudgetMonth | undefined>
  findByMonthKey(monthKey: MonthKey): Promise<BudgetMonth | undefined>
  list(): Promise<BudgetMonth[]>
  /** Insert or replace a month with the same id. */
  save(month: BudgetMonth): Promise<void>
}

export interface IncomeRepository {
  findById(id: EntityId): Promise<Income | undefined>
  listByMonth(monthId: EntityId): Promise<Income[]>
  save(income: Income): Promise<void>
  delete(id: EntityId): Promise<void>
}

export interface FreeExpenseRepository {
  findById(id: EntityId): Promise<FreeExpense | undefined>
  listByMonth(monthId: EntityId): Promise<FreeExpense[]>
  save(expense: FreeExpense): Promise<void>
  delete(id: EntityId): Promise<void>
}

/** Starting the app is one idempotent write of the first month and default settings. */
export interface OnboardingRepository {
  initialize(monthKey: MonthKey): Promise<BudgetMonth>
}

export interface ObligationRepository {
  findById(id: EntityId): Promise<MonthlyObligation | undefined>
  listByMonth(monthId: EntityId): Promise<MonthlyObligation[]>
  /** Insert or replace an obligation with the same id. */
  save(obligation: MonthlyObligation): Promise<void>
}

export interface ObligationPaymentRepository {
  findById(id: EntityId): Promise<ObligationPayment | undefined>
  listByMonth(monthId: EntityId): Promise<ObligationPayment[]>
  listByObligation(obligationId: EntityId): Promise<ObligationPayment[]>
  /** Insert or replace a payment with the same id. */
  save(payment: ObligationPayment): Promise<void>
  delete(id: EntityId): Promise<void>
}

export interface AddObligationPaymentsInput {
  obligationId: EntityId
  /** One entry per parsed addend; all entries must be saved together. */
  amounts: readonly MoneyMinorUnits[]
  paidAt: IsoDate
  note?: string | null
}

/** Multi-table commands; callers do not need to know which database implements them. */
export interface BudgetWriteRepository {
  createMonthFromTemplates(month: BudgetMonth): Promise<MonthlyObligation[]>
  createMonthFromSource(
    month: BudgetMonth,
    sourceMonthId: EntityId | null,
  ): Promise<MonthlyObligation[]>
  addObligationPayments(input: AddObligationPaymentsInput): Promise<ObligationPayment[]>
  deleteObligationWithPayments(obligationId: EntityId): Promise<void>
  deleteMonthWithRelatedData(monthId: EntityId): Promise<void>
}
