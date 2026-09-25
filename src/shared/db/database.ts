import { Dexie, type EntityTable } from 'dexie'

import type {
  AppSettings,
  BudgetMonth,
  FreeExpense,
  Income,
  MonthlyObligation,
  ObligationPayment,
  ObligationTemplate,
} from '@/domain/models'
import { createDefaultSettings } from '@/domain/settings'
import { schemaV1, schemaV2, schemaV3, schemaV4, schemaV5 } from './schema'

export class SafeToSpendDatabase extends Dexie {
  settings!: EntityTable<AppSettings, 'id'>
  budgetMonths!: EntityTable<BudgetMonth, 'id'>
  obligationTemplates!: EntityTable<ObligationTemplate, 'id'>
  monthlyObligations!: EntityTable<MonthlyObligation, 'id'>
  obligationPayments!: EntityTable<ObligationPayment, 'id'>
  incomes!: EntityTable<Income, 'id'>
  freeExpenses!: EntityTable<FreeExpense, 'id'>

  constructor(name = 'safe-to-spend') {
    super(name)
    this.version(1).stores(schemaV1)
    this.version(2).stores(schemaV2)
    this.version(3).stores(schemaV3)
    this.version(4)
      .stores(schemaV4)
      .upgrade(async (transaction) => {
        if ((await transaction.table('budgetMonths').count()) === 0) return
        const settings = transaction.table('settings')
        if (!(await settings.get('app-settings'))) {
          await settings.add(createDefaultSettings(new Date().toISOString()))
        }
      })
    this.version(5).stores(schemaV5)
  }
}

export const db = new SafeToSpendDatabase()
