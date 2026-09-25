import {
  calculateActualPaidByObligation,
  calculateObligationVariance,
  calculateRemainingReserve,
} from '@/domain/calculations'
import type { MoneyMinorUnits, MonthlyObligation, ObligationPayment } from '@/domain/models'

/** Values for one card; these are derived for the UI and are never stored. */
export interface ObligationPreview {
  obligation: MonthlyObligation
  payments: readonly ObligationPayment[]
  actualPaid: MoneyMinorUnits
  remainingReserve: MoneyMinorUnits
  savings: MoneyMinorUnits
  overspend: MoneyMinorUnits
}

export function createObligationPreview(
  obligation: MonthlyObligation,
  payments: readonly ObligationPayment[],
): ObligationPreview {
  const relatedPayments = payments
    .filter((payment) => payment.obligationId === obligation.id)
    .sort((left, right) => left.paidAt.localeCompare(right.paidAt))
  const variance = calculateObligationVariance(obligation, relatedPayments)

  return {
    obligation,
    payments: relatedPayments,
    actualPaid: calculateActualPaidByObligation(obligation.id, relatedPayments),
    remainingReserve: calculateRemainingReserve(obligation, relatedPayments),
    savings: obligation.isSettled ? Math.max(-variance, 0) : 0,
    overspend: Math.max(variance, 0),
  }
}
