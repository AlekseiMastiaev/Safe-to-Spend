import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Income } from '@/domain/models'
import IncomeList from '../incomes/IncomeList.vue'
import IncomeListItem from '../incomes/IncomeListItem.vue'

const createdAt = '2026-09-01T08:00:00.000Z'
const monthId = 'demo-month'

const receivedIncome: Income = {
  id: 'received-income',
  monthId,
  title: 'Зарплата',
  amount: 8_000_000,
  status: 'received',
  receivedAt: createdAt,
  createdAt,
  updatedAt: createdAt,
}

const plannedIncome: Income = {
  id: 'planned-income',
  monthId,
  title: 'Ожидаемый доход',
  amount: 2_000_000,
  status: 'planned',
  receivedAt: null,
  createdAt,
  updatedAt: createdAt,
}

describe('IncomeList', () => {
  it('renders incomes with different statuses and forwards a selection event', async () => {
    const wrapper = mount(IncomeList, {
      props: { incomes: [receivedIncome, plannedIncome], selectedId: null },
    })

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text().replace(/[\u00a0\u202f]/g, ' ')).toContain('80 000 ₽')
    expect(wrapper.text()).toContain('Получен')
    expect(wrapper.text()).toContain('Запланирован')

    await wrapper.get('li:first-child button').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[receivedIncome.id]])
  })

  it('shows an empty state when there are no incomes', () => {
    const wrapper = mount(IncomeList, {
      props: { incomes: [], selectedId: null },
    })

    expect(wrapper.text()).toContain('Доходов пока нет')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})

describe('IncomeListItem', () => {
  it('shows its controlled selection state', () => {
    const wrapper = mount(IncomeListItem, {
      props: { income: plannedIncome, selected: true },
    })

    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button').text()).toBe('Выбрано')
  })
})
