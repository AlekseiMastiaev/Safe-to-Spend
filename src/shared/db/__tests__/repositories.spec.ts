// @vitest-environment node
import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Dexie } from 'dexie'

import type {
  BudgetMonth,
  FreeExpense,
  Income,
  MonthlyObligation,
  ObligationPayment,
} from '@/domain/models'
import { SafeToSpendDatabase } from '../database'
import {
  DexieMonthRepository,
  DexieFreeExpenseRepository,
  DexieIncomeRepository,
  DexieObligationPaymentRepository,
  DexieObligationRepository,
} from '../repositories'
import { schemaV1, schemaV2, schemaV3 } from '../schema'

const timestamp = '2026-09-18T12:00:00.000Z'

const month: BudgetMonth = {
  id: 'month-1',
  monthKey: '2026-09',
  createdAt: timestamp,
  updatedAt: timestamp,
}

const obligation: MonthlyObligation = {
  id: 'obligation-1',
  monthId: month.id,
  templateId: null,
  title: 'Коммунальные услуги',
  plannedAmount: 1_000_000,
  sortOrder: 2,
  isSettled: false,
  settledAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const payment: ObligationPayment = {
  id: 'payment-1',
  monthId: month.id,
  obligationId: obligation.id,
  amount: 600_000,
  paidAt: '2026-09-12',
  note: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

describe('Dexie repositories', () => {
  let databaseName: string
  let database: SafeToSpendDatabase
  let testNumber = 0

  beforeEach(() => {
    testNumber += 1
    databaseName = `safe-to-spend-repository-test-${testNumber}`
    database = new SafeToSpendDatabase(databaseName)
  })

  afterEach(async () => {
    database.close()
    await Dexie.delete(databaseName)
  })

  it('upgrades a v1 database without losing obligations or payments', async () => {
    const legacy = new Dexie(databaseName)
    legacy.version(1).stores(schemaV1)

    await legacy.open()
    await legacy.table('monthlyObligations').add(obligation)
    await legacy.table('obligationPayments').add(payment)
    legacy.close()

    await database.open()

    expect(database.verno).toBe(5)
    expect(database.tables.map((table) => table.name).sort()).toEqual([
      'budgetMonths',
      'freeExpenses',
      'incomes',
      'monthlyObligations',
      'obligationPayments',
      'obligationTemplates',
      'settings',
    ])
    expect(await database.monthlyObligations.get(obligation.id)).toEqual(obligation)
    expect(await database.obligationPayments.get(payment.id)).toEqual(payment)
  })

  it('saves, lists, updates and deletes incomes and free expenses', async () => {
    const incomes = new DexieIncomeRepository(database)
    const expenses = new DexieFreeExpenseRepository(database)
    const income: Income = {
      id: 'income-1',
      monthId: month.id,
      title: 'Зарплата',
      amount: 8_000_000,
      status: 'planned',
      receivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const expense: FreeExpense = {
      id: 'expense-1',
      monthId: month.id,
      title: 'Продукты',
      amount: 250_000,
      spentAt: '2026-09-18',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await database.budgetMonths.add(month)
    await incomes.save(income)
    await expenses.save(expense)

    expect(await incomes.listByMonth(month.id)).toEqual([income])
    expect(await expenses.listByMonth(month.id)).toEqual([expense])

    const received: Income = { ...income, status: 'received', receivedAt: timestamp }
    await incomes.save(received)
    expect(await incomes.findById(income.id)).toEqual(received)

    await incomes.delete(income.id)
    await expenses.delete(expense.id)
    expect(await incomes.findById(income.id)).toBeUndefined()
    expect(await expenses.findById(expense.id)).toBeUndefined()
  })

  it('finds months by id or unique month key', async () => {
    const repository = new DexieMonthRepository(database)

    expect(await repository.findById('missing')).toBeUndefined()
    await repository.save(month)

    expect(await repository.findById(month.id)).toEqual(month)
    expect(await repository.findByMonthKey(month.monthKey)).toEqual(month)
    expect(await repository.list()).toEqual([month])
    await expect(repository.save({ ...month, id: 'another-month' })).rejects.toMatchObject({
      name: 'ConstraintError',
    })
  })

  it('adds default settings to an existing v3 budget without changing its month', async () => {
    const legacy = new Dexie(databaseName)
    legacy.version(1).stores(schemaV1)
    legacy.version(2).stores(schemaV2)
    legacy.version(3).stores(schemaV3)
    await legacy.open()
    await legacy.table('budgetMonths').add(month)
    legacy.close()

    await database.open()

    expect(await database.budgetMonths.get(month.id)).toEqual(month)
    expect(await database.settings.get('app-settings')).toMatchObject({
      currency: 'RUB',
      locale: 'ru-RU',
      colorScheme: 'system',
    })
  })

  it('lists obligations for one month in sort order', async () => {
    const repository = new DexieObligationRepository(database)
    const first = { ...obligation, id: 'obligation-2', sortOrder: 1 }
    const otherMonth = { ...obligation, id: 'obligation-3', monthId: 'month-2' }

    await database.budgetMonths.bulkAdd([month, { ...month, id: 'month-2', monthKey: '2026-10' }])
    await repository.save(obligation)
    await repository.save(first)
    await repository.save(otherMonth)

    expect(await repository.findById(obligation.id)).toEqual(obligation)
    expect(await repository.listByMonth(month.id)).toEqual([first, obligation])
  })

  it('lists separate payments for one obligation and replaces a reused id', async () => {
    const repository = new DexieObligationPaymentRepository(database)
    const earlier = { ...payment, id: 'payment-2', amount: 200_000, paidAt: '2026-09-10' }
    const otherObligation = { ...payment, id: 'payment-3', obligationId: 'obligation-2' }
    const otherMonthPayment = {
      ...payment,
      id: 'payment-4',
      monthId: 'month-2',
      obligationId: 'obligation-3',
    }

    await database.budgetMonths.bulkAdd([month, { ...month, id: 'month-2', monthKey: '2026-10' }])
    await database.monthlyObligations.bulkAdd([
      obligation,
      { ...obligation, id: 'obligation-2' },
      { ...obligation, id: 'obligation-3', monthId: 'month-2' },
    ])
    await repository.save(payment)
    await repository.save(earlier)
    await repository.save(otherObligation)
    await repository.save(otherMonthPayment)

    expect(await repository.findById(payment.id)).toEqual(payment)
    expect(await repository.listByObligation(obligation.id)).toEqual([earlier, payment])
    expect((await repository.listByMonth(month.id)).map(({ id }) => id)).toEqual([
      earlier.id,
      payment.id,
      otherObligation.id,
    ])
    expect(await repository.listByMonth('month-2')).toEqual([otherMonthPayment])

    const corrected = { ...payment, amount: 700_000 }
    await repository.save(corrected)

    expect(await repository.findById(payment.id)).toEqual(corrected)
    expect(await repository.listByObligation(obligation.id)).toEqual([earlier, corrected])
  })

  it('rejects orphan obligations and payments or mismatched payment months', async () => {
    const obligations = new DexieObligationRepository(database)
    const payments = new DexieObligationPaymentRepository(database)

    await expect(obligations.save(obligation)).rejects.toThrow('без бюджетного месяца')
    await database.budgetMonths.add(month)
    await expect(payments.save(payment)).rejects.toThrow('существующему обязательству')
    await obligations.save(obligation)
    await expect(payments.save({ ...payment, monthId: 'month-2' })).rejects.toThrow(
      'того же месяца',
    )
    await expect(payments.save({ ...payment, amount: 0 })).rejects.toThrow('положительной суммой')
    expect(await database.obligationPayments.count()).toBe(0)
  })

  it('does not move existing obligations or payments to a different parent', async () => {
    const obligations = new DexieObligationRepository(database)
    const payments = new DexieObligationPaymentRepository(database)
    await database.budgetMonths.bulkAdd([month, { ...month, id: 'month-2', monthKey: '2026-10' }])
    await obligations.save(obligation)
    await obligations.save({ ...obligation, id: 'obligation-2' })
    await payments.save(payment)

    await expect(obligations.save({ ...obligation, monthId: 'month-2' })).rejects.toThrow(
      'другой месяц',
    )
    await expect(payments.save({ ...payment, obligationId: 'obligation-2' })).rejects.toThrow(
      'другой расход',
    )
    expect(await obligations.findById(obligation.id)).toEqual(obligation)
    expect(await payments.findById(payment.id)).toEqual(payment)
  })
})
