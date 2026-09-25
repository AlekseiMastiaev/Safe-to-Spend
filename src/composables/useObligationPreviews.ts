import { createObligationPreview } from '@/components/obligations/preview'
import type { EntityId } from '@/domain/models'
import type { ObligationPaymentRepository, ObligationRepository } from '@/domain/repositories'
import { useDexieLiveQuery } from './useDexieLiveQuery'

/** Read from repositories; never persist calculated actuals or reserves. */
export function useObligationPreviews(
  monthId: EntityId,
  obligations: ObligationRepository,
  payments: ObligationPaymentRepository,
) {
  return useDexieLiveQuery(async () => {
    const [monthObligations, monthPayments] = await Promise.all([
      obligations.listByMonth(monthId),
      payments.listByMonth(monthId),
    ])

    return monthObligations.map((obligation) => createObligationPreview(obligation, monthPayments))
  })
}
