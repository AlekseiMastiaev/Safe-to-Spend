import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppSettings,
  BudgetMonth,
  EntityId,
  FreeExpense,
  Income,
  MonthKey,
  MonthlyObligation,
  ObligationPayment,
  ObligationTemplate,
} from '@/domain/models'
import { isValidMonthKey } from '@/domain/month'
import type {
  AddObligationPaymentsInput,
  BudgetWriteRepository,
  FreeExpenseRepository,
  IncomeRepository,
  MonthRepository,
  ObligationPaymentRepository,
  ObligationRepository,
  OnboardingRepository,
} from '@/domain/repositories'
import type { BackupData, DataMaintenanceRepository } from '@/shared/persistence/contracts'

interface MonthRow {
  id: string
  month_key: string
  created_at: string
  updated_at: string
}

interface IncomeRow {
  id: string
  month_id: string
  title: string
  amount: number
  status: 'planned' | 'received'
  received_at: string | null
  created_at: string
  updated_at: string
}

interface ObligationRow {
  id: string
  month_id: string
  template_id: string | null
  title: string
  planned_amount: number
  sort_order: number
  is_settled: boolean
  settled_at: string | null
  created_at: string
  updated_at: string
}

interface PaymentRow {
  id: string
  month_id: string
  obligation_id: string
  amount: number
  paid_at: string
  note: string | null
  created_at: string
  updated_at: string
}

interface ExpenseRow {
  id: string
  month_id: string
  title: string
  amount: number
  spent_at: string
  created_at: string
  updated_at: string
}

interface TemplateRow {
  id: string
  title: string
  default_planned_amount: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface SettingsRow {
  currency: 'RUB'
  locale: 'ru-RU'
  color_scheme: 'system' | 'light' | 'dark'
  created_at: string
  updated_at: string
}

type SupabaseError = { message: string } | null

function assertNoError(error: SupabaseError): void {
  if (error) throw new Error(error.message)
}

function requireRow<T>(data: T | null, message: string): T {
  if (data === null) throw new Error(message)
  return data
}

async function requireUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getSession()
  assertNoError(error)
  const userId = data.session?.user.id
  if (!userId) throw new Error('Сначала войдите в аккаунт')
  return userId
}

function toMonth(row: MonthRow): BudgetMonth {
  return {
    id: row.id,
    monthKey: row.month_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toIncome(row: IncomeRow): Income {
  const base = {
    id: row.id,
    monthId: row.month_id,
    title: row.title,
    amount: row.amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  return row.status === 'received'
    ? {
        ...base,
        status: 'received',
        receivedAt: requireRow(row.received_at, 'У полученного дохода нет даты'),
      }
    : { ...base, status: 'planned', receivedAt: null }
}

function toObligation(row: ObligationRow): MonthlyObligation {
  const base = {
    id: row.id,
    monthId: row.month_id,
    templateId: row.template_id,
    title: row.title,
    plannedAmount: row.planned_amount,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  return row.is_settled
    ? {
        ...base,
        isSettled: true,
        settledAt: requireRow(row.settled_at, 'У закрытого расхода нет даты закрытия'),
      }
    : { ...base, isSettled: false, settledAt: null }
}

function toPayment(row: PaymentRow): ObligationPayment {
  return {
    id: row.id,
    monthId: row.month_id,
    obligationId: row.obligation_id,
    amount: row.amount,
    paidAt: row.paid_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toExpense(row: ExpenseRow): FreeExpense {
  return {
    id: row.id,
    monthId: row.month_id,
    title: row.title,
    amount: row.amount,
    spentAt: row.spent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toTemplate(row: TemplateRow): ObligationTemplate {
  return {
    id: row.id,
    title: row.title,
    defaultPlannedAmount: row.default_planned_amount,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toSettings(row: SettingsRow): AppSettings {
  return {
    id: 'app-settings',
    currency: row.currency,
    locale: row.locale,
    colorScheme: row.color_scheme,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseMonthRepository implements MonthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<BudgetMonth | undefined> {
    const { data, error } = await this.client
      .from('budget_months')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    assertNoError(error)
    return data ? toMonth(data as MonthRow) : undefined
  }

  async findByMonthKey(monthKey: MonthKey): Promise<BudgetMonth | undefined> {
    const { data, error } = await this.client
      .from('budget_months')
      .select('*')
      .eq('month_key', monthKey)
      .maybeSingle()
    assertNoError(error)
    return data ? toMonth(data as MonthRow) : undefined
  }

  async list(): Promise<BudgetMonth[]> {
    const { data, error } = await this.client.from('budget_months').select('*').order('month_key')
    assertNoError(error)
    return (data as MonthRow[]).map(toMonth)
  }

  async save(month: BudgetMonth): Promise<void> {
    const userId = await requireUserId(this.client)
    const { error } = await this.client.from('budget_months').upsert({
      id: month.id,
      user_id: userId,
      month_key: month.monthKey,
      created_at: month.createdAt,
      updated_at: month.updatedAt,
    })
    assertNoError(error)
  }
}

export class SupabaseIncomeRepository implements IncomeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<Income | undefined> {
    const { data, error } = await this.client.from('incomes').select('*').eq('id', id).maybeSingle()
    assertNoError(error)
    return data ? toIncome(data as IncomeRow) : undefined
  }

  async listByMonth(monthId: EntityId): Promise<Income[]> {
    const { data, error } = await this.client
      .from('incomes')
      .select('*')
      .eq('month_id', monthId)
      .order('created_at')
    assertNoError(error)
    return (data as IncomeRow[]).map(toIncome)
  }

  async save(income: Income): Promise<void> {
    const userId = await requireUserId(this.client)
    const { error } = await this.client.from('incomes').upsert({
      id: income.id,
      user_id: userId,
      month_id: income.monthId,
      title: income.title,
      amount: income.amount,
      status: income.status,
      received_at: income.receivedAt,
      created_at: income.createdAt,
      updated_at: income.updatedAt,
    })
    assertNoError(error)
  }

  async delete(id: EntityId): Promise<void> {
    const { error } = await this.client.from('incomes').delete().eq('id', id)
    assertNoError(error)
  }
}

export class SupabaseFreeExpenseRepository implements FreeExpenseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<FreeExpense | undefined> {
    const { data, error } = await this.client
      .from('free_expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    assertNoError(error)
    return data ? toExpense(data as ExpenseRow) : undefined
  }

  async listByMonth(monthId: EntityId): Promise<FreeExpense[]> {
    const { data, error } = await this.client
      .from('free_expenses')
      .select('*')
      .eq('month_id', monthId)
      .order('spent_at', { ascending: false })
      .order('created_at', { ascending: false })
    assertNoError(error)
    return (data as ExpenseRow[]).map(toExpense)
  }

  async save(expense: FreeExpense): Promise<void> {
    const userId = await requireUserId(this.client)
    const { error } = await this.client.from('free_expenses').upsert({
      id: expense.id,
      user_id: userId,
      month_id: expense.monthId,
      title: expense.title,
      amount: expense.amount,
      spent_at: expense.spentAt,
      created_at: expense.createdAt,
      updated_at: expense.updatedAt,
    })
    assertNoError(error)
  }

  async delete(id: EntityId): Promise<void> {
    const { error } = await this.client.from('free_expenses').delete().eq('id', id)
    assertNoError(error)
  }
}

export class SupabaseObligationRepository implements ObligationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<MonthlyObligation | undefined> {
    const { data, error } = await this.client
      .from('monthly_obligations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    assertNoError(error)
    return data ? toObligation(data as ObligationRow) : undefined
  }

  async listByMonth(monthId: EntityId): Promise<MonthlyObligation[]> {
    const { data, error } = await this.client
      .from('monthly_obligations')
      .select('*')
      .eq('month_id', monthId)
      .order('sort_order')
      .order('id')
    assertNoError(error)
    return (data as ObligationRow[]).map(toObligation)
  }

  async save(obligation: MonthlyObligation): Promise<void> {
    const userId = await requireUserId(this.client)
    const { error } = await this.client.from('monthly_obligations').upsert({
      id: obligation.id,
      user_id: userId,
      month_id: obligation.monthId,
      template_id: obligation.templateId,
      title: obligation.title,
      planned_amount: obligation.plannedAmount,
      sort_order: obligation.sortOrder,
      is_settled: obligation.isSettled,
      settled_at: obligation.settledAt,
      created_at: obligation.createdAt,
      updated_at: obligation.updatedAt,
    })
    assertNoError(error)
  }
}

export class SupabaseObligationPaymentRepository implements ObligationPaymentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<ObligationPayment | undefined> {
    const { data, error } = await this.client
      .from('obligation_payments')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    assertNoError(error)
    return data ? toPayment(data as PaymentRow) : undefined
  }

  async listByMonth(monthId: EntityId): Promise<ObligationPayment[]> {
    const { data, error } = await this.client
      .from('obligation_payments')
      .select('*')
      .eq('month_id', monthId)
      .order('paid_at')
      .order('id')
    assertNoError(error)
    return (data as PaymentRow[]).map(toPayment)
  }

  async listByObligation(obligationId: EntityId): Promise<ObligationPayment[]> {
    const { data, error } = await this.client
      .from('obligation_payments')
      .select('*')
      .eq('obligation_id', obligationId)
      .order('paid_at')
      .order('id')
    assertNoError(error)
    return (data as PaymentRow[]).map(toPayment)
  }

  async save(payment: ObligationPayment): Promise<void> {
    const userId = await requireUserId(this.client)
    const { error } = await this.client.from('obligation_payments').upsert({
      id: payment.id,
      user_id: userId,
      month_id: payment.monthId,
      obligation_id: payment.obligationId,
      amount: payment.amount,
      paid_at: payment.paidAt,
      note: payment.note,
      created_at: payment.createdAt,
      updated_at: payment.updatedAt,
    })
    assertNoError(error)
  }

  async delete(id: EntityId): Promise<void> {
    const { error } = await this.client.from('obligation_payments').delete().eq('id', id)
    assertNoError(error)
  }
}

export class SupabaseOnboardingRepository implements OnboardingRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly createId: () => EntityId = () => crypto.randomUUID(),
  ) {}

  async initialize(monthKey: MonthKey): Promise<BudgetMonth> {
    if (!isValidMonthKey(monthKey)) throw new Error('Некорректный идентификатор месяца')
    const timestamp = new Date().toISOString()
    const { data, error } = await this.client
      .rpc('initialize_user_budget', {
        p_month_id: this.createId(),
        p_month_key: monthKey,
        p_timestamp: timestamp,
      })
      .single()
    assertNoError(error)
    return toMonth(requireRow(data as MonthRow | null, 'Месяц не был создан'))
  }
}

export class SupabaseBudgetWriteRepository implements BudgetWriteRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly createId: () => EntityId = () => crypto.randomUUID(),
  ) {}

  createMonthFromTemplates(month: BudgetMonth): Promise<MonthlyObligation[]> {
    return this.createMonthFromSource(month, null)
  }

  async createMonthFromSource(
    month: BudgetMonth,
    sourceMonthId: EntityId | null,
  ): Promise<MonthlyObligation[]> {
    if (!isValidMonthKey(month.monthKey)) throw new Error('Некорректный бюджетный месяц')
    const { data, error } = await this.client.rpc('create_budget_month', {
      p_month_id: month.id,
      p_month_key: month.monthKey,
      p_timestamp: month.createdAt,
      p_source_month_id: sourceMonthId,
    })
    assertNoError(error)
    return (data as ObligationRow[]).map(toObligation)
  }

  async addObligationPayments(input: AddObligationPaymentsInput): Promise<ObligationPayment[]> {
    if (
      input.amounts.length === 0 ||
      input.amounts.some((amount) => !Number.isSafeInteger(amount) || amount <= 0)
    ) {
      throw new Error('Каждый платёж должен быть положительной суммой в копейках')
    }
    const paymentIds = input.amounts.map(() => this.createId())
    const { data, error } = await this.client.rpc('add_obligation_payments', {
      p_obligation_id: input.obligationId,
      p_payment_ids: paymentIds,
      p_amounts: input.amounts,
      p_paid_at: input.paidAt,
      p_note: input.note ?? null,
      p_timestamp: new Date().toISOString(),
    })
    assertNoError(error)
    return (data as PaymentRow[]).map(toPayment)
  }

  async deleteObligationWithPayments(obligationId: EntityId): Promise<void> {
    const { error } = await this.client.from('monthly_obligations').delete().eq('id', obligationId)
    assertNoError(error)
  }

  async deleteMonthWithRelatedData(monthId: EntityId): Promise<void> {
    const { error } = await this.client.from('budget_months').delete().eq('id', monthId)
    assertNoError(error)
  }
}

export class SupabaseDataMaintenanceRepository implements DataMaintenanceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async exportAll(): Promise<BackupData> {
    const results = await Promise.all([
      this.client.from('user_settings').select('*'),
      this.client.from('budget_months').select('*').order('month_key'),
      this.client.from('incomes').select('*'),
      this.client.from('obligation_templates').select('*'),
      this.client.from('monthly_obligations').select('*'),
      this.client.from('obligation_payments').select('*'),
      this.client.from('free_expenses').select('*'),
    ])
    for (const result of results) assertNoError(result.error)

    return {
      settings: (results[0].data as SettingsRow[]).map(toSettings),
      budgetMonths: (results[1].data as MonthRow[]).map(toMonth),
      incomes: (results[2].data as IncomeRow[]).map(toIncome),
      obligationTemplates: (results[3].data as TemplateRow[]).map(toTemplate),
      monthlyObligations: (results[4].data as ObligationRow[]).map(toObligation),
      obligationPayments: (results[5].data as PaymentRow[]).map(toPayment),
      freeExpenses: (results[6].data as ExpenseRow[]).map(toExpense),
    }
  }

  async clearAll(): Promise<void> {
    const userId = await requireUserId(this.client)
    const monthResult = await this.client.from('budget_months').delete().eq('user_id', userId)
    assertNoError(monthResult.error)
    const templateResult = await this.client
      .from('obligation_templates')
      .delete()
      .eq('user_id', userId)
    assertNoError(templateResult.error)
    const settingsResult = await this.client.from('user_settings').delete().eq('user_id', userId)
    assertNoError(settingsResult.error)
  }
}
