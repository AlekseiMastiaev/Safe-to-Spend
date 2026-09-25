// @vitest-environment node
import 'fake-indexeddb/auto'

import { Dexie } from 'dexie'
import { effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MonthlyObligation, ObligationPayment } from '@/domain/models'
import { SafeToSpendDatabase } from '@/shared/db/database'
import {
  DexieObligationPaymentRepository,
  DexieObligationRepository,
} from '@/shared/db/repositories'
import { useDexieLiveQuery } from '../useDexieLiveQuery'
import { useObligationPreviews } from '../useObligationPreviews'

const timestamp = '2026-09-18T12:00:00.000Z'
const monthId = 'month-1'

const obligation: MonthlyObligation = {
  id: 'utilities',
  monthId,
  templateId: null,
  title: 'Коммунальные услуги',
  plannedAmount: 1_000_000,
  sortOrder: 0,
  isSettled: false,
  settledAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

function payment(id: string, amount: number): ObligationPayment {
  return {
    id,
    monthId,
    obligationId: obligation.id,
    amount,
    paidAt: '2026-09-18',
    note: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

describe('reactive obligation reading', () => {
  let databaseName: string
  let database: SafeToSpendDatabase
  let scope: EffectScope
  let testNumber = 0

  beforeEach(() => {
    testNumber += 1
    databaseName = `safe-to-spend-live-query-test-${testNumber}`
    database = new SafeToSpendDatabase(databaseName)
    scope = effectScope()
  })

  afterEach(async () => {
    scope.stop()
    database.close()
    await Dexie.delete(databaseName)
  })

  it('distinguishes loading from a ready but empty month', async () => {
    const state = scope.run(() =>
      useObligationPreviews(
        monthId,
        new DexieObligationRepository(database),
        new DexieObligationPaymentRepository(database),
      ),
    )

    expect(state?.value).toEqual({ status: 'loading' })
    await vi.waitFor(() => expect(state?.value).toEqual({ status: 'ready', data: [] }))
  })

  it('exposes a query error instead of treating it as an empty result', async () => {
    const state = scope.run(() =>
      useDexieLiveQuery(() => Promise.reject(new Error('database unavailable'))),
    )

    await vi.waitFor(() => expect(state?.value.status).toBe('error'))
    expect(state?.value).toMatchObject({
      status: 'error',
      error: new Error('database unavailable'),
    })
  })

  it('recalculates actual paid and reserve after each committed payment', async () => {
    const obligations = new DexieObligationRepository(database)
    const payments = new DexieObligationPaymentRepository(database)
    await database.budgetMonths.add({
      id: monthId,
      monthKey: '2026-09',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await obligations.save(obligation)

    const state = scope.run(() => useObligationPreviews(monthId, obligations, payments))

    await vi.waitFor(() =>
      expect(state?.value).toMatchObject({
        status: 'ready',
        data: [
          { obligation: { plannedAmount: 1_000_000 }, actualPaid: 0, remainingReserve: 1_000_000 },
        ],
      }),
    )

    await payments.save(payment('first', 600_000))
    await vi.waitFor(() =>
      expect(state?.value).toMatchObject({
        status: 'ready',
        data: [{ actualPaid: 600_000, remainingReserve: 400_000, overspend: 0 }],
      }),
    )

    await payments.save(payment('second', 500_000))
    await vi.waitFor(() =>
      expect(state?.value).toMatchObject({
        status: 'ready',
        data: [{ actualPaid: 1_100_000, remainingReserve: 0, overspend: 100_000 }],
      }),
    )

    await payments.save(payment('second', 300_000))
    await vi.waitFor(() =>
      expect(state?.value).toMatchObject({
        status: 'ready',
        data: [{ actualPaid: 900_000, remainingReserve: 100_000, overspend: 0 }],
      }),
    )

    await database.obligationPayments.delete('first')
    await vi.waitFor(() =>
      expect(state?.value).toMatchObject({
        status: 'ready',
        data: [{ actualPaid: 300_000, remainingReserve: 700_000 }],
      }),
    )

    await obligations.save({ ...obligation, isSettled: true, settledAt: timestamp })
    await vi.waitFor(() =>
      expect(state?.value).toMatchObject({
        status: 'ready',
        data: [{ actualPaid: 300_000, remainingReserve: 0, savings: 700_000 }],
      }),
    )
  })
})
