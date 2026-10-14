// @vitest-environment node
import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BudgetMonth, MonthlyObligation } from '@/domain/models'
import { calculateBudgetSummary } from '@/domain/calculations'
import { SafeToSpendDatabase } from '../database'
import { DexieBudgetReadRepository } from '../budget-reader'
import { DexieBudgetWriteRepository } from '../transactions'
import {
  DexieIncomeRepository,
  DexieObligationRepository,
  DexieObligationPaymentRepository,
} from '../repositories'
import { DexieDataMaintenanceRepository } from '@/shared/persistence/local-maintenance'

const timestamp = '2026-10-01T08:00:00.000Z'
const source: BudgetMonth = {
  id: 'august',
  monthKey: '2026-08',
  createdAt: timestamp,
  updatedAt: timestamp,
}
const current: BudgetMonth = {
  id: 'october',
  monthKey: '2026-10',
  createdAt: timestamp,
  updatedAt: timestamp,
}
const obligation: MonthlyObligation = {
  id: 'source-obligation',
  monthId: source.id,
  templateId: null,
  title: 'Аренда',
  plannedAmount: 4_000,
  sortOrder: 0,
  isSettled: true,
  settledAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
}

describe('budget month lifecycle', () => {
  let database: SafeToSpendDatabase
  let writer: DexieBudgetWriteRepository
  beforeEach(() => {
    database = new SafeToSpendDatabase(`month-lifecycle-${crypto.randomUUID()}`)
    writer = new DexieBudgetWriteRepository(database)
  })
  afterEach(async () => {
    database.close()
    await Dexie.delete(database.name)
  })
  async function seed() {
    await database.budgetMonths.add(source)
    await database.monthlyObligations.add(obligation)
    await database.obligationPayments.add({
      id: 'source-payment',
      monthId: source.id,
      obligationId: obligation.id,
      amount: 1_000,
      paidAt: '2026-08-02',
      note: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await database.incomes.add({
      id: 'income',
      monthId: source.id,
      title: 'Доход',
      amount: 10_000,
      status: 'received',
      receivedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  it('keeps onboarding and concurrently creates only one current month with independent open plans', async () => {
    expect(await writer.ensureCurrentMonth(current)).toBeNull()
    await seed()
    const [one, two] = await Promise.all([
      writer.ensureCurrentMonth(current),
      writer.ensureCurrentMonth({ ...current, id: 'other-device' }),
    ])
    expect(one?.id).toBe(two?.id)
    expect(await database.budgetMonths.count()).toBe(2)
    expect(one?.obligationsReviewPending).toBe(true)
    const plans = await database.monthlyObligations.where('monthId').equals(one!.id).toArray()
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({
      title: 'Аренда',
      plannedAmount: 4_000,
      isSettled: false,
      settledAt: null,
    })
    expect(await database.obligationPayments.where('monthId').equals(one!.id).count()).toBe(0)
    expect(await database.monthlyObligations.get(obligation.id)).toEqual(obligation)
  })

  it('rolls back both month and plans if copying fails, and preserves an existing review flag', async () => {
    await seed()
    const broken = new DexieBudgetWriteRepository(database, () => obligation.id)
    await expect(broken.ensureCurrentMonth(current)).rejects.toThrow(/ConstraintError/)
    expect(await database.budgetMonths.get(current.id)).toBeUndefined()
    await writer.ensureCurrentMonth(current)
    await database.budgetMonths.update(current.id, { obligationsReviewPending: false })
    expect((await writer.ensureCurrentMonth(current))?.obligationsReviewPending).toBe(false)
  })

  it('does not show a review notice when no plans were copied', async () => {
    await database.budgetMonths.add(source)
    expect((await writer.ensureCurrentMonth(current))?.obligationsReviewPending).toBe(false)
  })

  it('keeps the notice on failed edits and clears it atomically on a new obligation', async () => {
    await seed()
    await writer.ensureCurrentMonth(current)
    const repository = new DexieObligationRepository(database)
    await expect(
      repository.save({ ...obligation, id: 'new', monthId: current.id, plannedAmount: 0 }),
    ).rejects.toThrow('положительной')
    expect((await database.budgetMonths.get(current.id))?.obligationsReviewPending).toBe(true)
    await repository.save({ ...obligation, id: 'new', monthId: current.id })
    expect((await database.budgetMonths.get(current.id))?.obligationsReviewPending).toBe(false)
  })

  it('clears review after adding, editing or deleting payments and deleting an obligation', async () => {
    await seed()
    await writer.ensureCurrentMonth(current)
    const plan = (
      await database.monthlyObligations.where('monthId').equals(current.id).toArray()
    )[0]!
    const [payment] = await writer.addObligationPayments({
      obligationId: plan.id,
      amounts: [100],
      paidAt: '2026-10-02',
    })
    expect((await database.budgetMonths.get(current.id))?.obligationsReviewPending).toBe(false)
    const payments = new DexieObligationPaymentRepository(database)
    await database.budgetMonths.update(current.id, { obligationsReviewPending: true })
    await payments.save({ ...payment!, amount: 200 })
    expect((await database.budgetMonths.get(current.id))?.obligationsReviewPending).toBe(false)
    await database.budgetMonths.update(current.id, { obligationsReviewPending: true })
    await payments.delete(payment!.id)
    expect((await database.budgetMonths.get(current.id))?.obligationsReviewPending).toBe(false)
    await database.budgetMonths.update(current.id, { obligationsReviewPending: true })
    await writer.deleteObligationWithPayments(plan.id)
    expect((await database.budgetMonths.get(current.id))?.obligationsReviewPending).toBe(false)
  })

  it('derives carryover from one snapshot, rejects writes to it and exports only source records', async () => {
    await seed()
    await writer.ensureCurrentMonth(current)
    const reader = new DexieBudgetReadRepository(database)
    const budget = await reader.readMonth(current.monthKey, current.monthKey)
    expect(budget.incomes[0]).toMatchObject({
      kind: 'carryover',
      amount: 9_000,
      sourceMonthKey: '2026-08',
    })
    expect(calculateBudgetSummary(budget).safeToSpend).toBe(5_000)
    await database.freeExpenses.add({
      id: 'late-expense',
      monthId: source.id,
      title: 'Поздняя запись',
      amount: 2_000,
      spentAt: '2026-08-03',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    expect((await reader.readMonth(current.monthKey, current.monthKey)).incomes[0]?.amount).toBe(
      7_000,
    )
    const incomes = new DexieIncomeRepository(database)
    await expect(incomes.save(budget.incomes[0]!)).rejects.toThrow('исходный месяц')
    expect(() => incomes.delete(budget.incomes[0]!.id)).toThrow('исходный месяц')
    const backup = await new DexieDataMaintenanceRepository(database).exportAll()
    expect(backup.incomes).toHaveLength(1)
    expect(
      backup.budgetMonths.find((month) => month.id === current.id)?.obligationsReviewPending,
    ).toBe(true)
  })
})
