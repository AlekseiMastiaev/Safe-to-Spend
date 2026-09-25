// @vitest-environment node
import 'fake-indexeddb/auto'

import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  BudgetMonth,
  FreeExpense,
  Income,
  MonthlyObligation,
  ObligationPayment,
  ObligationTemplate,
} from '@/domain/models'
import { parseMoneyAdditionExpression } from '@/domain/money'
import { SafeToSpendDatabase } from '../database'
import { DexieBudgetWriteRepository } from '../transactions'

const timestamp = '2026-09-18T12:00:00.000Z'
const month: BudgetMonth = {
  id: 'month-1',
  monthKey: '2026-09',
  createdAt: timestamp,
  updatedAt: timestamp,
}
const obligation: MonthlyObligation = {
  id: 'utilities',
  monthId: month.id,
  templateId: null,
  title: 'Коммунальные услуги',
  plannedAmount: 1_000_000,
  sortOrder: 0,
  isSettled: false,
  settledAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}
const activeTemplate: ObligationTemplate = {
  id: 'fuel',
  title: 'Бензин',
  defaultPlannedAmount: 800_000,
  isActive: true,
  sortOrder: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
}

function payment(id: string, monthId: string, obligationId: string): ObligationPayment {
  return {
    id,
    monthId,
    obligationId,
    amount: 100_000,
    paidAt: '2026-09-18',
    note: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

describe('transactional budget writes', () => {
  let databaseName: string
  let database: SafeToSpendDatabase
  let testNumber = 0

  beforeEach(() => {
    testNumber += 1
    databaseName = `safe-to-spend-transactions-test-${testNumber}`
    database = new SafeToSpendDatabase(databaseName)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    database.close()
    await Dexie.delete(databaseName)
  })

  it('copies only active template plans into a new, open month', async () => {
    await database.obligationTemplates.bulkAdd([
      activeTemplate,
      { ...activeTemplate, id: 'inactive', isActive: false },
      { ...activeTemplate, id: 'rent', title: 'Аренда', sortOrder: 0 },
    ])

    const created = await new DexieBudgetWriteRepository(database).createMonthFromTemplates(month)

    expect(created.map(({ templateId, sortOrder }) => [templateId, sortOrder])).toEqual([
      ['rent', 0],
      ['fuel', 1],
    ])
    expect(created[0]).toMatchObject({
      monthId: month.id,
      plannedAmount: 800_000,
      isSettled: false,
      settledAt: null,
    })
    expect(await database.obligationPayments.count()).toBe(0)
    expect(await database.budgetMonths.get(month.id)).toEqual(month)

    await expect(
      new DexieBudgetWriteRepository(database).createMonthFromTemplates({
        ...month,
        id: 'another-month',
      }),
    ).rejects.toMatchObject({ name: 'ConstraintError' })
    expect(await database.monthlyObligations.where('monthId').equals('another-month').count()).toBe(
      0,
    )
  })

  it('rolls back the month when copying template obligations fails', async () => {
    await database.obligationTemplates.bulkAdd([
      activeTemplate,
      { ...activeTemplate, id: 'second' },
    ])

    const writer = new DexieBudgetWriteRepository(database, () => 'same-id')
    await expect(writer.createMonthFromTemplates(month)).rejects.toMatchObject({
      name: 'BulkError',
    })

    expect(await database.budgetMonths.count()).toBe(0)
    expect(await database.monthlyObligations.count()).toBe(0)
    expect(await database.obligationTemplates.count()).toBe(2)
  })

  it('copies only obligation plans from a source month', async () => {
    await database.budgetMonths.add(month)
    await database.monthlyObligations.add({
      ...obligation,
      isSettled: true,
      settledAt: timestamp,
    })
    await database.obligationPayments.add(payment('old-payment', month.id, obligation.id))
    const nextMonth = { ...month, id: 'month-2', monthKey: '2026-10' }

    const created = await new DexieBudgetWriteRepository(
      database,
      () => 'copied-obligation',
    ).createMonthFromSource(nextMonth, month.id)

    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      id: 'copied-obligation',
      monthId: nextMonth.id,
      title: obligation.title,
      plannedAmount: obligation.plannedAmount,
      isSettled: false,
      settledAt: null,
    })
    expect(await database.obligationPayments.where('monthId').equals(nextMonth.id).count()).toBe(0)
  })

  it('saves every parsed addend as a separate payment or none of them', async () => {
    await database.budgetMonths.add(month)
    await database.monthlyObligations.add(obligation)
    const amounts = parseMoneyAdditionExpression('1 000 + 250,50 + 99.50')
    const input = {
      obligationId: obligation.id,
      amounts,
      paidAt: '2026-09-18',
      note: 'Счета за месяц',
    }

    const writer = new DexieBudgetWriteRepository(database)
    const created = await writer.addObligationPayments(input)
    expect(created.map(({ amount }) => amount)).toEqual([100_000, 25_050, 9_950])
    expect(await database.obligationPayments.count()).toBe(3)
    expect(created.every(({ monthId, note }) => monthId === month.id && note === input.note)).toBe(
      true,
    )

    const brokenWriter = new DexieBudgetWriteRepository(database, () => 'duplicate-id')
    await expect(brokenWriter.addObligationPayments(input)).rejects.toMatchObject({
      name: 'BulkError',
    })
    expect(await database.obligationPayments.count()).toBe(3)
    expect(await database.obligationPayments.get('duplicate-id')).toBeUndefined()
  })

  it('rejects invalid batches and payments for missing obligations', async () => {
    const writer = new DexieBudgetWriteRepository(database)
    const input = { obligationId: obligation.id, paidAt: '2026-09-18', amounts: [100_000] }

    await expect(writer.addObligationPayments(input)).rejects.toThrow('без обязательного расхода')
    await database.budgetMonths.add(month)
    await database.monthlyObligations.add(obligation)
    await expect(writer.addObligationPayments({ ...input, amounts: [100_000, 0] })).rejects.toThrow(
      'положительной суммой',
    )
    await expect(
      writer.addObligationPayments({ ...input, amounts: [Number.MAX_SAFE_INTEGER, 1] }),
    ).rejects.toThrow('безопасный диапазон')
    expect(await database.obligationPayments.count()).toBe(0)
  })

  it('deletes children with an obligation or month but keeps other months and templates', async () => {
    const otherMonth = { ...month, id: 'month-2', monthKey: '2026-10' }
    const otherObligation = { ...obligation, id: 'other', monthId: otherMonth.id }
    await database.obligationTemplates.add(activeTemplate)
    await database.budgetMonths.bulkAdd([month, otherMonth])
    await database.monthlyObligations.bulkAdd([obligation, otherObligation])
    await database.obligationPayments.bulkAdd([
      payment('first', month.id, obligation.id),
      payment('second', otherMonth.id, otherObligation.id),
    ])
    const income: Income = {
      id: 'income',
      monthId: month.id,
      title: 'Зарплата',
      amount: 1_000_000,
      status: 'planned',
      receivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const expense: FreeExpense = {
      id: 'expense',
      monthId: month.id,
      title: 'Кофе',
      amount: 20_000,
      spentAt: '2026-09-18',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await database.incomes.add(income)
    await database.freeExpenses.add(expense)

    const writer = new DexieBudgetWriteRepository(database)
    await writer.deleteObligationWithPayments(obligation.id)
    expect(await database.monthlyObligations.get(obligation.id)).toBeUndefined()
    expect(await database.obligationPayments.get('first')).toBeUndefined()
    expect(await database.obligationPayments.get('second')).toBeDefined()

    await database.monthlyObligations.add(obligation)
    await database.obligationPayments.add(payment('third', month.id, obligation.id))
    await writer.deleteMonthWithRelatedData(month.id)
    expect(await database.budgetMonths.get(month.id)).toBeUndefined()
    expect(await database.monthlyObligations.get(obligation.id)).toBeUndefined()
    expect(await database.obligationPayments.get('third')).toBeUndefined()
    expect(await database.incomes.get(income.id)).toBeUndefined()
    expect(await database.freeExpenses.get(expense.id)).toBeUndefined()
    expect(await database.budgetMonths.get(otherMonth.id)).toEqual(otherMonth)
    expect(await database.obligationPayments.get('second')).toBeDefined()
    expect(await database.obligationTemplates.get(activeTemplate.id)).toEqual(activeTemplate)
  })

  it('restores the month and its children if the final delete fails', async () => {
    await database.budgetMonths.add(month)
    await database.monthlyObligations.add(obligation)
    const existingPayment = payment('first', month.id, obligation.id)
    await database.obligationPayments.add(existingPayment)
    vi.spyOn(database.budgetMonths, 'delete').mockRejectedValueOnce(new Error('forced failure'))

    await expect(
      new DexieBudgetWriteRepository(database).deleteMonthWithRelatedData(month.id),
    ).rejects.toThrow('forced failure')

    expect(await database.budgetMonths.get(month.id)).toEqual(month)
    expect(await database.monthlyObligations.get(obligation.id)).toEqual(obligation)
    expect(await database.obligationPayments.get(existingPayment.id)).toEqual(existingPayment)
  })
})
