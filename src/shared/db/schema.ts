/** Only primary keys and fields used for indexed queries belong in this schema. */
export const schemaV1 = {
  monthlyObligations: 'id, monthId',
  obligationPayments: 'id, monthId, obligationId',
} as const

/** Add months without replacing the obligation and payment stores from v1. */
export const schemaV2 = {
  budgetMonths: 'id, &monthKey',
} as const

/** Templates are global; a month receives independent obligation snapshots. */
export const schemaV3 = {
  obligationTemplates: 'id',
} as const

/** Persist onboarding defaults without rewriting existing month stores. */
export const schemaV4 = {
  settings: 'id',
} as const

/** Persist the remaining two transaction types used by the MVP. */
export const schemaV5 = {
  incomes: 'id, monthId, status, createdAt',
  freeExpenses: 'id, monthId, spentAt, createdAt',
} as const
