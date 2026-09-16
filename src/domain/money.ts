import type { MoneyMinorUnits } from './models'

const GROUPING_SPACE_PATTERN = /[ \u00a0\u202f]/g
const MONEY_INPUT_PATTERN = /^(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d{1,2})?$/
const MAX_SAFE_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER)

const wholeRublesFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const fractionalRublesFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function parseDecimalToMinorUnits(input: string): MoneyMinorUnits {
  if (!MONEY_INPUT_PATTERN.test(input)) {
    throw new Error('Некорректный формат денежной суммы')
  }

  const normalizedInput = input.replace(GROUPING_SPACE_PATTERN, '').replace(',', '.')
  const decimalSeparatorIndex = normalizedInput.indexOf('.')
  const majorPart =
    decimalSeparatorIndex === -1 ? normalizedInput : normalizedInput.slice(0, decimalSeparatorIndex)
  const fractionPart =
    decimalSeparatorIndex === -1 ? '' : normalizedInput.slice(decimalSeparatorIndex + 1)
  const paddedFractionPart = fractionPart.padEnd(2, '0')
  const minorUnits = BigInt(majorPart) * 100n + BigInt(paddedFractionPart || '0')

  if (minorUnits > MAX_SAFE_MINOR_UNITS) {
    throw new Error('Денежная сумма превышает безопасный диапазон')
  }

  return Number(minorUnits)
}

function assertSafeMinorUnits(amount: MoneyMinorUnits): void {
  if (!Number.isSafeInteger(amount)) {
    throw new Error('Сумма в копейках должна быть безопасным целым числом')
  }
}

export function parseMoneyInput(input: string): MoneyMinorUnits {
  const normalizedInput = input.trim()

  if (normalizedInput.length === 0) {
    throw new Error('Введите денежную сумму')
  }

  if (normalizedInput.startsWith('-')) {
    throw new Error('Денежная сумма должна быть положительной')
  }

  const minorUnits = parseDecimalToMinorUnits(normalizedInput)

  if (minorUnits === 0) {
    throw new Error('Денежная сумма должна быть больше нуля')
  }

  return minorUnits
}

export function parseMoneyAdditionExpression(input: string): MoneyMinorUnits[] {
  let normalizedExpression = input.trim()

  if (normalizedExpression.endsWith('+')) {
    normalizedExpression = normalizedExpression.slice(0, -1).trimEnd()
  }

  if (normalizedExpression.length === 0) {
    throw new Error('Введите хотя бы одну денежную сумму')
  }

  const parts = normalizedExpression.split('+')

  if (parts.some((part) => part.trim().length === 0)) {
    throw new Error('Между знаками сложения должна быть денежная сумма')
  }

  const amounts = parts.map((part) => parseMoneyInput(part))
  const total = amounts.reduce((sum, amount) => sum + amount, 0)

  if (!Number.isSafeInteger(total)) {
    throw new Error('Итоговая сумма превышает безопасный диапазон')
  }

  return amounts
}

export function toMinorUnits(amountInRubles: number): MoneyMinorUnits {
  if (!Number.isFinite(amountInRubles)) {
    throw new Error('Сумма должна быть конечным числом')
  }

  if (amountInRubles === 0) {
    return 0
  }

  const sign = Math.sign(amountInRubles)
  const minorUnits = parseDecimalToMinorUnits(Math.abs(amountInRubles).toString())

  return sign * minorUnits
}

export function fromMinorUnits(amount: MoneyMinorUnits): number {
  assertSafeMinorUnits(amount)

  return amount / 100
}

export function formatMoney(amount: MoneyMinorUnits): string {
  assertSafeMinorUnits(amount)

  const formatter = amount % 100 === 0 ? wholeRublesFormatter : fractionalRublesFormatter

  return formatter.format(fromMinorUnits(amount))
}
