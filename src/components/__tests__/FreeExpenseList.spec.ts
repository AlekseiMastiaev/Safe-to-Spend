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
  it('shows newest spending first without changing the input array and forwards an item action', async () => {
    const wrapper = mount(FreeExpenseList, {
      props: { expenses },
    })
    const items = wrapper.findAll('.free-expense-list > li')

    expect(items.map((item) => item.get('h3').text())).toEqual(['Кофе', 'Такси', 'Продукты'])
    expect(expenses.map((expense) => expense.id)).toEqual(['groceries', 'taxi', 'coffee'])

    await wrapper.get('li:first-child button[aria-expanded="false"]').trigger('click')
    await wrapper.get('li:first-child .item-actions-menu__popup button').trigger('click')
    expect(wrapper.emitted('edit')).toEqual([['coffee']])
  })

  it('shows an empty state for no free expenses', () => {
    const wrapper = mount(FreeExpenseList, {
      props: { expenses: [] },
    })

    expect(wrapper.text()).toContain('Свободных расходов пока нет')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})

describe('FreeExpenseListItem', () => {
  it('formats the date and amount and reveals actions on demand', async () => {
    const wrapper = mount(FreeExpenseListItem, {
      props: { expense: expenses[0]! },
    })

    expect(wrapper.get('time').attributes('datetime')).toBe('2026-09-04')
    expect(wrapper.get('time').text()).toContain('4 сентября 2026')
    expect(normalizeSpaces(wrapper.text())).toContain('2 350,50 ₽')
    expect(wrapper.text()).not.toContain('Выбрать')
    const actionsToggle = wrapper.get('button[aria-label="Действия с тратой: Продукты"]')
    expect(actionsToggle.attributes('aria-expanded')).toBe('false')
    expect(actionsToggle.text()).toBe('')
    expect(actionsToggle.find('.app-icon').exists()).toBe(true)

    await actionsToggle.trigger('click')

    expect(wrapper.get('button[aria-expanded="true"]')).toBeDefined()
    expect(wrapper.text()).toContain('Изменить')
    expect(wrapper.text()).toContain('Удалить')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.item-actions-menu__popup').exists()).toBe(false)
    expect(actionsToggle.attributes('aria-expanded')).toBe('false')
  })
})
