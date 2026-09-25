// @vitest-environment node
import 'fake-indexeddb/auto'

import { Dexie } from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppSettings, BudgetMonth } from '@/domain/models'
import { SafeToSpendDatabase } from '../database'
import { DexieOnboardingRepository } from '../onboarding'

const timestamp = '2026-09-18T12:00:00.000Z'

describe('first-run persistence', () => {
  let databaseName: string
  let database: SafeToSpendDatabase
  let testNumber = 0

  beforeEach(() => {
    testNumber += 1
    databaseName = `safe-to-spend-onboarding-test-${testNumber}`
    database = new SafeToSpendDatabase(databaseName)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    database.close()
    await Dexie.delete(databaseName)
  })

  it('creates one month and the default settings, then survives reopening', async () => {
    const repository = new DexieOnboardingRepository(database)
    const month = await repository.initialize('2026-09')

    expect(month).toMatchObject({ monthKey: '2026-09' })
    expect(await database.settings.get('app-settings')).toMatchObject({
      currency: 'RUB',
      locale: 'ru-RU',
      colorScheme: 'system',
    })

    database.close()
    database = new SafeToSpendDatabase(databaseName)
    expect(await database.budgetMonths.get(month.id)).toEqual(month)
    expect(await database.settings.count()).toBe(1)
  })

  it('is idempotent even when the start action is triggered twice', async () => {
    const repository = new DexieOnboardingRepository(database)
    const [first, second] = await Promise.all([
      repository.initialize('2026-09'),
      repository.initialize('2026-09'),
    ])

    expect(second).toEqual(first)
    expect(await database.budgetMonths.count()).toBe(1)
    expect(await database.settings.count()).toBe(1)
  })

  it('keeps an existing month and restores missing defaults without creating another month', async () => {
    const existing: BudgetMonth = {
      id: 'existing',
      monthKey: '2026-08',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await database.budgetMonths.add(existing)

    expect(await new DexieOnboardingRepository(database).initialize('2026-09')).toEqual(existing)
    expect(await database.budgetMonths.count()).toBe(1)
    expect(await database.settings.get('app-settings')).toMatchObject({ colorScheme: 'system' })
  })

  it('does not overwrite settings that were already chosen', async () => {
    const settings: AppSettings = {
      id: 'app-settings',
      currency: 'RUB',
      locale: 'ru-RU',
      colorScheme: 'dark',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await database.settings.add(settings)

    await new DexieOnboardingRepository(database).initialize('2026-09')
    expect(await database.settings.get('app-settings')).toEqual(settings)
  })

  it('rolls back settings when creating the month fails', async () => {
    vi.spyOn(database.budgetMonths, 'add').mockRejectedValueOnce(new Error('forced failure'))

    await expect(new DexieOnboardingRepository(database).initialize('2026-09')).rejects.toThrow(
      'forced failure',
    )
    expect(await database.settings.count()).toBe(0)
    expect(await database.budgetMonths.count()).toBe(0)
  })

  it('rejects an invalid month before writing anything', async () => {
    await expect(new DexieOnboardingRepository(database).initialize('2026-13')).rejects.toThrow(
      'Некорректный идентификатор месяца',
    )
    expect(await database.settings.count()).toBe(0)
    expect(await database.budgetMonths.count()).toBe(0)
  })
})
