import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BudgetCard from '../BudgetCard.vue'

const defaultProps = {
  title: 'Безопасный остаток',
  amount: '12 500 ₽',
  label: 'Доступно для свободных трат',
  state: 'positive' as const,
  selected: false,
}

describe('BudgetCard', () => {
  it('renders values received through props', () => {
    const wrapper = mount(BudgetCard, {
      props: defaultProps,
    })

    expect(wrapper.text()).toContain(defaultProps.title)
    expect(wrapper.text()).toContain(defaultProps.amount)
    expect(wrapper.text()).toContain(defaultProps.label)
  })

  it('emits select when the button is clicked', async () => {
    const wrapper = mount(BudgetCard, {
      props: defaultProps,
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('shows the controlled selected state', () => {
    const wrapper = mount(BudgetCard, {
      props: {
        ...defaultProps,
        selected: true,
      },
    })

    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button').text()).toBe('Выбрано')
  })
})
