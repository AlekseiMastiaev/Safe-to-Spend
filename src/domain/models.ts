/**
 * These aliases add domain vocabulary, but do not validate values at runtime.
 * Parsing and boundary validation will be implemented separately.
 */
export type EntityId = string
export type MonthKey = string
export type IsoDate = string
export type IsoDateTime = string
export type MoneyMinorUnits = number

export interface PersistedEntity {
  id: EntityId
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface BudgetMonth extends PersistedEntity {
  monthKey: MonthKey
}

interface IncomeBase extends PersistedEntity {
  monthId: EntityId
  title: string
  amount: MoneyMinorUnits
}

export interface PlannedIncome extends IncomeBase {
  status: 'planned'
  receivedAt: null
}

export interface ReceivedIncome extends IncomeBase {
  status: 'received'
  receivedAt: IsoDateTime
}

export type Income = PlannedIncome | ReceivedIncome
export type IncomeStatus = Income['status']

export interface ObligationTemplate extends PersistedEntity {
  title: string
  defaultPlannedAmount: MoneyMinorUnits
  isActive: boolean
  sortOrder: number
}

interface MonthlyObligationBase extends PersistedEntity {
  monthId: EntityId
  templateId: EntityId | null
  title: string
  plannedAmount: MoneyMinorUnits
  sortOrder: number
}

export interface OpenMonthlyObligation extends MonthlyObligationBase {
  isSettled: false
  settledAt: null
}

export interface SettledMonthlyObligation extends MonthlyObligationBase {
  isSettled: true
  settledAt: IsoDateTime
}

export type MonthlyObligation = OpenMonthlyObligation | SettledMonthlyObligation

export interface ObligationPayment extends PersistedEntity {
  monthId: EntityId
  obligationId: EntityId
  amount: MoneyMinorUnits
  paidAt: IsoDate
  note: string | null
}

export interface FreeExpense extends PersistedEntity {
  monthId: EntityId
  title: string
  amount: MoneyMinorUnits
  spentAt: IsoDate
}

/** Derived value object. It is calculated from entities and is not persisted. */
export interface BudgetSummary {
  plannedIncome: MoneyMinorUnits
  receivedIncome: MoneyMinorUnits
  plannedObligationTotal: MoneyMinorUnits
  actualObligationPaymentsTotal: MoneyMinorUnits
  remainingReserve: MoneyMinorUnits
  settledSavingsTotal: MoneyMinorUnits
  overspendTotal: MoneyMinorUnits
  freeExpensesTotal: MoneyMinorUnits
  plannedFreeBalance: MoneyMinorUnits
  actualBalance: MoneyMinorUnits
  safeToSpend: MoneyMinorUnits
}
