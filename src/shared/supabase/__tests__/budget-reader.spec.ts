// @vitest-environment node
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { SupabaseBudgetReadRepository, SupabaseBudgetWriteRepository } from '../repositories'
import { calculateBudgetSummary } from '@/domain/calculations'

const timestamp = '2026-09-01T08:00:00.000Z'
const rows = {
  budget_months: ['2026-09', '2026-10'].map((key) => ({
    id: key,
    month_key: key,
    created_at: timestamp,
    updated_at: timestamp,
  })),
  incomes: [
    {
      id: 'income',
      month_id: '2026-09',
      title: 'Доход',
      amount: 10_000,
      status: 'received',
      received_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ],
  monthly_obligations: [
    {
      id: 'reserve',
      month_id: '2026-09',
      template_id: null,
      title: 'Резерв',
      planned_amount: 4_000,
      sort_order: 0,
      is_settled: false,
      settled_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ],
  obligation_payments: [
    {
      id: 'payment',
      month_id: '2026-09',
      obligation_id: 'reserve',
      amount: 1_000,
      paid_at: '2026-09-05',
      note: null,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ],
  free_expenses: [
    {
      id: 'expense',
      month_id: '2026-09',
      title: 'Траты',
      amount: 2_000,
      spent_at: '2026-09-05',
      created_at: timestamp,
      updated_at: timestamp,
    },
  ],
}

describe('cloud budget contracts', () => {
  it('reads one RPC snapshot and follows the same reserve and spending rule', async () => {
    const rpc = vi
      .fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>()
      .mockResolvedValue({ data: rows, error: null })
    const reader = new SupabaseBudgetReadRepository({ rpc } as unknown as SupabaseClient)
    const budget = await reader.readMonth('2026-10', '2026-10')
    expect(rpc).toHaveBeenCalledExactlyOnceWith('read_budget_history', { p_month_key: '2026-10' })
    expect(budget.incomes[0]).toMatchObject({
      amount: 4_000,
      kind: 'carryover',
      sourceMonthKey: '2026-09',
    })
    expect(calculateBudgetSummary(budget).safeToSpend).toBe(4_000)
    expect(budget.month.obligationsReviewPending).toBe(false)
  })

  it('does not turn RPC failures into an empty budget or zero carryover', async () => {
    const rpc = vi
      .fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>()
      .mockResolvedValue({ data: null, error: { message: 'offline' } })
    await expect(
      new SupabaseBudgetReadRepository({ rpc } as unknown as SupabaseClient).readMonth(
        '2026-10',
        '2026-10',
      ),
    ).rejects.toThrow('offline')
  })

  it('delegates automatic month creation to the atomic RPC and preserves onboarding', async () => {
    const rpc = vi
      .fn<(...args: unknown[]) => Promise<{ data: unknown; error: unknown }>>()
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ ...rows.budget_months[1]!, obligations_review_pending: true }],
        error: null,
      })
    const writer = new SupabaseBudgetWriteRepository({ rpc } as unknown as SupabaseClient)
    const month = { id: '2026-10', monthKey: '2026-10', createdAt: timestamp, updatedAt: timestamp }
    expect(await writer.ensureCurrentMonth(month)).toBeNull()
    expect((await writer.ensureCurrentMonth(month))?.obligationsReviewPending).toBe(true)
    expect(rpc).toHaveBeenCalledWith('ensure_current_budget_month', {
      p_month_id: month.id,
      p_month_key: month.monthKey,
      p_timestamp: timestamp,
    })
  })
})
