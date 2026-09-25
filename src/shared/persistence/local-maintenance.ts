import type { DataMaintenanceRepository, BackupData } from './contracts'
import type { SafeToSpendDatabase } from '@/shared/db/database'

export class DexieDataMaintenanceRepository implements DataMaintenanceRepository {
  constructor(private readonly database: SafeToSpendDatabase) {}

  async exportAll(): Promise<BackupData> {
    const [
      settings,
      budgetMonths,
      incomes,
      obligationTemplates,
      monthlyObligations,
      obligationPayments,
      freeExpenses,
    ] = await Promise.all([
      this.database.settings.toArray(),
      this.database.budgetMonths.toArray(),
      this.database.incomes.toArray(),
      this.database.obligationTemplates.toArray(),
      this.database.monthlyObligations.toArray(),
      this.database.obligationPayments.toArray(),
      this.database.freeExpenses.toArray(),
    ])

    return {
      settings,
      budgetMonths,
      incomes,
      obligationTemplates,
      monthlyObligations,
      obligationPayments,
      freeExpenses,
    }
  }

  async clearAll(): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.settings,
        this.database.budgetMonths,
        this.database.incomes,
        this.database.obligationTemplates,
        this.database.monthlyObligations,
        this.database.obligationPayments,
        this.database.freeExpenses,
      ],
      async () => {
        await Promise.all([
          this.database.settings.clear(),
          this.database.budgetMonths.clear(),
          this.database.incomes.clear(),
          this.database.obligationTemplates.clear(),
          this.database.monthlyObligations.clear(),
          this.database.obligationPayments.clear(),
          this.database.freeExpenses.clear(),
        ])
      },
    )
  }
}
