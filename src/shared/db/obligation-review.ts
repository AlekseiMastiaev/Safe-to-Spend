import type { EntityId } from '@/domain/models'
import type { SafeToSpendDatabase } from './database'

/** Must run in the same write transaction as the obligation or payment mutation. */
export async function acknowledgeObligationReview(
  database: SafeToSpendDatabase,
  monthId: EntityId,
): Promise<void> {
  const month = await database.budgetMonths.get(monthId)
  if (month?.obligationsReviewPending) {
    await database.budgetMonths.update(monthId, { obligationsReviewPending: false })
  }
}
