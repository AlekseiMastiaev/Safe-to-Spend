import type { BudgetMonth, EntityId, MonthlyObligation, ObligationPayment } from '@/domain/models'
import type { AddObligationPaymentsInput, BudgetWriteRepository } from '@/domain/repositories'
import { parseMonthKey } from '@/domain/month'
import type { SafeToSpendDatabase } from './database'

/** Keep validation outside the transaction; no incomplete batch can be committed. */
function assertPaymentAmounts(amounts: readonly number[]): void {
  if (
    amounts.length === 0 ||
    amounts.some((amount) => !Number.isSafeInteger(amount) || amount <= 0)
  ) {
    throw new Error('Каждый платёж должен быть положительной суммой в копейках')
  }

  const total = amounts.reduce((sum, amount) => sum + BigInt(amount), 0n)
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Итоговая сумма превышает безопасный диапазон')
  }
}

export class DexieBudgetWriteRepository implements BudgetWriteRepository {
  constructor(
    private readonly database: SafeToSpendDatabase,
    private readonly createId: () => EntityId = () => crypto.randomUUID(),
  ) {}

  async createMonthFromTemplates(month: BudgetMonth): Promise<MonthlyObligation[]> {
    if (parseMonthKey(month.monthKey) === null) {
      throw new Error('Некорректный бюджетный месяц')
    }

    return this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.obligationTemplates,
      this.database.monthlyObligations,
      async () => {
        const templates = (await this.database.obligationTemplates.toArray())
          .filter((template) => template.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))

        for (const template of templates) {
          if (
            !template.title.trim() ||
            !Number.isSafeInteger(template.defaultPlannedAmount) ||
            template.defaultPlannedAmount <= 0
          ) {
            throw new Error('Некорректный шаблон обязательного расхода')
          }
        }

        await this.database.budgetMonths.add(month)
        const obligations: MonthlyObligation[] = templates.map((template, sortOrder) => ({
          id: this.createId(),
          monthId: month.id,
          templateId: template.id,
          title: template.title,
          plannedAmount: template.defaultPlannedAmount,
          sortOrder,
          isSettled: false,
          settledAt: null,
          createdAt: month.createdAt,
          updatedAt: month.createdAt,
        }))

        if (obligations.length > 0) {
          await this.database.monthlyObligations.bulkAdd(obligations)
        }
        return obligations
      },
    )
  }

  async createMonthFromSource(
    month: BudgetMonth,
    sourceMonthId: EntityId | null,
  ): Promise<MonthlyObligation[]> {
    if (parseMonthKey(month.monthKey) === null) {
      throw new Error('Некорректный бюджетный месяц')
    }

    return this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.monthlyObligations,
      async () => {
        const sourceObligations = sourceMonthId
          ? await this.database.monthlyObligations.where('monthId').equals(sourceMonthId).toArray()
          : []
        const orderedSource = sourceObligations.sort(
          (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
        )

        await this.database.budgetMonths.add(month)
        const obligations: MonthlyObligation[] = orderedSource.map((source, sortOrder) => ({
          id: this.createId(),
          monthId: month.id,
          templateId: source.templateId,
          title: source.title,
          plannedAmount: source.plannedAmount,
          sortOrder,
          isSettled: false,
          settledAt: null,
          createdAt: month.createdAt,
          updatedAt: month.createdAt,
        }))
        if (obligations.length > 0) await this.database.monthlyObligations.bulkAdd(obligations)
        return obligations
      },
    )
  }

  async addObligationPayments(input: AddObligationPaymentsInput): Promise<ObligationPayment[]> {
    assertPaymentAmounts(input.amounts)

    return this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.monthlyObligations,
      this.database.obligationPayments,
      async () => {
        const obligation = await this.database.monthlyObligations.get(input.obligationId)
        if (!obligation) {
          throw new Error('Нельзя добавить платёж без обязательного расхода')
        }
        if (!(await this.database.budgetMonths.get(obligation.monthId))) {
          throw new Error('Нельзя добавить платёж без бюджетного месяца')
        }

        const timestamp = new Date().toISOString()
        const payments: ObligationPayment[] = input.amounts.map((amount) => ({
          id: this.createId(),
          monthId: obligation.monthId,
          obligationId: obligation.id,
          amount,
          paidAt: input.paidAt,
          note: input.note ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        }))

        await this.database.obligationPayments.bulkAdd(payments)
        return payments
      },
    )
  }

  async deleteObligationWithPayments(obligationId: EntityId): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.monthlyObligations,
      this.database.obligationPayments,
      async () => {
        await this.database.obligationPayments.where('obligationId').equals(obligationId).delete()
        await this.database.monthlyObligations.delete(obligationId)
      },
    )
  }

  async deleteMonthWithRelatedData(monthId: EntityId): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.budgetMonths,
      this.database.incomes,
      this.database.monthlyObligations,
      this.database.obligationPayments,
      this.database.freeExpenses,
      async () => {
        await this.database.obligationPayments.where('monthId').equals(monthId).delete()
        await this.database.monthlyObligations.where('monthId').equals(monthId).delete()
        await this.database.incomes.where('monthId').equals(monthId).delete()
        await this.database.freeExpenses.where('monthId').equals(monthId).delete()
        await this.database.budgetMonths.delete(monthId)
      },
    )
  }
}
