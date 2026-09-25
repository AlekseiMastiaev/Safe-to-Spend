import type {
  AppSettings,
  BudgetMonth,
  FreeExpense,
  Income,
  MonthlyObligation,
  ObligationPayment,
  ObligationTemplate,
} from '@/domain/models'

export interface BackupData {
  settings: AppSettings[]
  budgetMonths: BudgetMonth[]
  incomes: Income[]
  obligationTemplates: ObligationTemplate[]
  monthlyObligations: MonthlyObligation[]
  obligationPayments: ObligationPayment[]
  freeExpenses: FreeExpense[]
}

export interface DataMaintenanceRepository {
  exportAll(): Promise<BackupData>
  clearAll(): Promise<void>
}
