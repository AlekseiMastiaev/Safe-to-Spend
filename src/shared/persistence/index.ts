import type {
  BudgetWriteRepository,
  FreeExpenseRepository,
  IncomeRepository,
  MonthRepository,
  ObligationPaymentRepository,
  ObligationRepository,
  OnboardingRepository,
} from '@/domain/repositories'
import { db } from '@/shared/db/database'
import { DexieOnboardingRepository } from '@/shared/db/onboarding'
import {
  DexieFreeExpenseRepository,
  DexieIncomeRepository,
  DexieMonthRepository,
  DexieObligationPaymentRepository,
  DexieObligationRepository,
} from '@/shared/db/repositories'
import { DexieBudgetWriteRepository } from '@/shared/db/transactions'
import { isCloudMode, requireSupabase, supabase } from '@/shared/supabase/client'
import {
  SupabaseBudgetWriteRepository,
  SupabaseDataMaintenanceRepository,
  SupabaseFreeExpenseRepository,
  SupabaseIncomeRepository,
  SupabaseMonthRepository,
  SupabaseObligationPaymentRepository,
  SupabaseObligationRepository,
  SupabaseOnboardingRepository,
} from '@/shared/supabase/repositories'
import type { DataMaintenanceRepository } from './contracts'
import { DexieDataMaintenanceRepository } from './local-maintenance'

const cloudClient = supabase

export const persistenceMode: 'cloud' | 'local' = isCloudMode ? 'cloud' : 'local'

export const monthRepository: MonthRepository = cloudClient
  ? new SupabaseMonthRepository(cloudClient)
  : new DexieMonthRepository(db)

export const incomeRepository: IncomeRepository = cloudClient
  ? new SupabaseIncomeRepository(cloudClient)
  : new DexieIncomeRepository(db)

export const freeExpenseRepository: FreeExpenseRepository = cloudClient
  ? new SupabaseFreeExpenseRepository(cloudClient)
  : new DexieFreeExpenseRepository(db)

export const obligationRepository: ObligationRepository = cloudClient
  ? new SupabaseObligationRepository(cloudClient)
  : new DexieObligationRepository(db)

export const paymentRepository: ObligationPaymentRepository = cloudClient
  ? new SupabaseObligationPaymentRepository(cloudClient)
  : new DexieObligationPaymentRepository(db)

export const onboardingRepository: OnboardingRepository = cloudClient
  ? new SupabaseOnboardingRepository(cloudClient)
  : new DexieOnboardingRepository(db)

export const budgetWriter: BudgetWriteRepository = cloudClient
  ? new SupabaseBudgetWriteRepository(cloudClient)
  : new DexieBudgetWriteRepository(db)

export const dataMaintenanceRepository: DataMaintenanceRepository = cloudClient
  ? new SupabaseDataMaintenanceRepository(cloudClient)
  : new DexieDataMaintenanceRepository(db)

export async function initializePersistence(): Promise<void> {
  if (persistenceMode === 'local') await db.open()
}

export function getCloudClient() {
  return requireSupabase()
}
