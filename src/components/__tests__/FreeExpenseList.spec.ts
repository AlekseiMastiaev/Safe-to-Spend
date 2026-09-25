import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { FreeExpense } from '@/domain/models'
import FreeExpenseList from '../expenses/FreeExpenseList.vue'
import FreeExpenseListItem from '../expenses/FreeExpenseListItem.vue'

const expenses: FreeExpense[] = [
  {
    id: 'groceries',
    monthId: 'month',
    title: 'Продукты',
    amount: 235_050,
    spentAt: '2026-09-04',
    createdAt: '2026-09-04T18:00:00.000Z',
    updatedAt: '2026-09-04T18:00:00.000Z',
  },
  {
    id: 'taxi',
    monthId: 'month',
    title: 'Такси',
    amount: 85_000,
    spentAt: '2026-09-12',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
  },
  {
    id: 'coffee',
    monthId: 'month',
    title: 'Кофе',
    amount: 25_000,
    spentAt: '2026-09-12',
    createdAt: '2026-09-12T13:00:00.000Z',
    updatedAt: '2026-09-12T13:00:00.000Z',
  },
]

function normalizeSpaces(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ')
}

describe('FreeExpenseList', () => {
  it('shows newest spending first without changing the input array and forwards selection', async () => {
    const wrapper = mount(FreeExpenseList, {
      props: { expenses, selectedId: null },
    })
    const items = wrapper.findAll('.free-expense-list > li')

    expect(items.map((item) => item.get('h3').text())).toEqual(['Кофе', 'Такси', 'Продукты'])
    expect(expenses.map((expense) => expense.id)).toEqual(['groceries', 'taxi', 'coffee'])

    await wrapper.get('li:first-child button').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['coffee']])
  })

  it('shows an empty state for no free expenses', () => {
    const wrapper = mount(FreeExpenseList, {
      props: { expenses: [], selectedId: null },
    })

    expect(wrapper.text()).toContain('Свободных расходов пока нет')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})

describe('FreeExpenseListItem', () => {
  it('formats the date and amount and marks a selected action button', () => {
    const wrapper = mount(FreeExpenseListItem, {
      props: { expense: expenses[0]!, selected: true },
    })

    expect(wrapper.get('time').attributes('datetime')).toBe('2026-09-04')
    expect(wrapper.get('time').text()).toContain('4 сентября 2026')
    expect(normalizeSpaces(wrapper.text())).toContain('2 350,50 ₽')
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button').text()).toBe('Выбрано')
  })
})
