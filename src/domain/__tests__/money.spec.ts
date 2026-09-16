import { describe, expect, it } from 'vitest'
import {
  formatMoney,
  fromMinorUnits,
  parseMoneyAdditionExpression,
  parseMoneyInput,
  toMinorUnits,
} from '../money'

describe('parseMoneyInput', () => {
  it.each([
    ['1000', 100_000],
    ['1 000', 100_000],
    ['1000,50', 100_050],
    ['1000.50', 100_050],
    ['0,01', 1],
    ['  12 500,5  ', 1_250_050],
  ])('parses %s into minor units', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected)
  })

  it.each([
    ['', /Введите денежную сумму/],
    ['0', /больше нуля/],
    ['-100', /положительной/],
    ['+100', /Некорректный формат/],
    ['10 00', /Некорректный формат/],
    ['1000,001', /Некорректный формат/],
    ['1000 рублей', /Некорректный формат/],
    ['1000 * 2', /Некорректный формат/],
    ['90071992547409.92', /безопасный диапазон/],
  ])('rejects invalid input %s', (input, expectedError) => {
    expect(() => parseMoneyInput(input)).toThrow(expectedError)
  })
})

describe('parseMoneyAdditionExpression', () => {
  it('returns every summand as a separate amount', () => {
    expect(parseMoneyAdditionExpression('1 000 + 250,50 + 99.50')).toEqual([100_000, 25_050, 9_950])
  })

  it('ignores one trailing plus without adding an empty summand', () => {
    expect(parseMoneyAdditionExpression('1000 +')).toEqual([100_000])
  })

  it.each([
    ['', /Введите хотя бы одну/],
    ['+', /Введите хотя бы одну/],
    ['1000 ++ 250', /Между знаками сложения/],
    ['1000 + +', /Между знаками сложения/],
    ['1000 - 250', /Некорректный формат/],
    ['1000 + 0', /больше нуля/],
  ])('rejects invalid expression %s', (input, expectedError) => {
    expect(() => parseMoneyAdditionExpression(input)).toThrow(expectedError)
  })

  it('rejects an unsafe total even when every summand is safe', () => {
    expect(() => parseMoneyAdditionExpression('90071992547409.91 + 0.01')).toThrow(
      /Итоговая сумма превышает безопасный диапазон/,
    )
  })
})

describe('money conversion and formatting', () => {
  it.each([
    [10.5, 1_050],
    [-12.34, -1_234],
    [0, 0],
  ])('converts %s rubles into minor units', (rubles, expected) => {
    expect(toMinorUnits(rubles)).toBe(expected)
  })

  it('rejects a number with more than two decimal places', () => {
    expect(() => toMinorUnits(1.005)).toThrow(/Некорректный формат/)
  })

  it('converts minor units into rubles', () => {
    expect(fromMinorUnits(123_450)).toBe(1234.5)
  })

  it('rejects a non-integer minor-unit value', () => {
    expect(() => fromMinorUnits(10.5)).toThrow(/безопасным целым числом/)
  })

  it.each([
    [1_250_000, '12 500 ₽'],
    [125_050, '1 250,50 ₽'],
    [-50_000, '-500 ₽'],
  ])('formats %s minor units as %s', (minorUnits, expected) => {
    const formatted = formatMoney(minorUnits).replace(/[\u00a0\u202f]/g, ' ')

    expect(formatted).toBe(expected)
  })
})
