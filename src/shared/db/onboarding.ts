import type { BudgetMonth, EntityId, MonthKey } from '@/domain/models'
import { isValidMonthKey } from '@/domain/month'
import type { OnboardingRepository } from '@/domain/repositories'
import { createDefaultSettings } from '@/domain/settings'
import type { SafeToSpendDatabase } from './database'

export class DexieOnboardingRepository implements OnboardingRepository {
  constructor(
    private readonly database: SafeToSpendDatabase,
    private readonly createId: () => EntityId = () => crypto.randomUUID(),
  ) {}

  async initialize(monthKey: MonthKey): Promise<BudgetMonth> {
    if (!isValidMonthKey(monthKey)) {
      throw new Error('Некорректный идентификатор месяца')
    }

    return this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.settings,
      async () => {
        const existing = await this.database.budgetMonths.orderBy('monthKey').last()
        const existingSettings = await this.database.settings.get('app-settings')
        const timestamp = new Date().toISOString()

        if (!existingSettings) {
          await this.database.settings.add(createDefaultSettings(timestamp))
        }

        if (existing) return existing

        const month: BudgetMonth = {
          id: this.createId(),
          monthKey,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        await this.database.budgetMonths.add(month)
        return month
      },
    )
  }
}
