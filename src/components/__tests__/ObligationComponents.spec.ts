import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { MonthlyObligation, ObligationPayment } from '@/domain/models'
import AppDialog from '../AppDialog.vue'
import ObligationList from '../obligations/ObligationList.vue'
import ObligationListItem from '../obligations/ObligationListItem.vue'
import PaymentHistoryDialog from '../obligations/PaymentHistoryDialog.vue'
import { createObligationPreview } from '../obligations/preview'

const createdAt = '2026-09-01T08:00:00.000Z'

const obligation: MonthlyObligation = {
  id: 'utilities',
  monthId: 'month',
  templateId: null,
  title: 'Коммунальные услуги',
  plannedAmount: 1_000_000,
  sortOrder: 0,
  isSettled: false,
  settledAt: null,
  createdAt,
  updatedAt: createdAt,
}

const payment: ObligationPayment = {
  id: 'payment',
  monthId: 'month',
  obligationId: obligation.id,
  amount: 600_000,
  paidAt: '2026-09-08',
  note: 'Первый счёт',
  createdAt,
  updatedAt: createdAt,
}

const preview = createObligationPreview(obligation, [payment])

function normalizeSpaces(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ')
}

describe('ObligationListItem', () => {
  it('renders values from props and emits the expense id when history is requested', async () => {
    const wrapper = mount(ObligationListItem, { props: { preview } })
    const text = normalizeSpaces(wrapper.text())

    expect(wrapper.get('h3').text()).toBe('Коммунальные услуги')
    expect(text).toContain('Частично оплачен')
    expect(text).toContain('10 000 ₽')
    expect(text).toContain('6 000 ₽')
    expect(text).toContain('4 000 ₽')
    expect(text).not.toContain('Экономия')

    await wrapper.get('button[aria-label="История платежей: Коммунальные услуги"]').trigger('click')
    expect(wrapper.emitted('showHistory')).toEqual([['utilities']])
  })

  it('keeps secondary actions collapsed until the user asks for them', async () => {
    const wrapper = mount(ObligationListItem, { props: { preview } })

    const actionsToggle = wrapper.get(
      'button[aria-label="Действия с расходом: Коммунальные услуги"]',
    )
    expect(actionsToggle.attributes('aria-expanded')).toBe('false')
    expect(actionsToggle.text()).toBe('')
    expect(actionsToggle.find('.app-icon').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Закрыть расход')
    expect(wrapper.text()).not.toContain('Изменить')

    await actionsToggle.trigger('click')

    expect(wrapper.get('button[aria-expanded="true"]')).toBeDefined()
    expect(wrapper.text()).toContain('Закрыть расход')
    expect(wrapper.text()).toContain('Изменить')
    expect(wrapper.text()).toContain('Удалить')
  })

  it('updates the visible state when the parent passes a settled obligation', async () => {
    const wrapper = mount(ObligationListItem, { props: { preview } })
    const settledObligation: MonthlyObligation = {
      ...obligation,
      isSettled: true,
      settledAt: '2026-09-09T08:00:00.000Z',
    }

    await wrapper.setProps({
      preview: createObligationPreview(settledObligation, [payment]),
    })

    const text = normalizeSpaces(wrapper.text())
    expect(text).toContain('Закрыт')
    expect(text).toContain('Экономия после закрытия: 4 000 ₽')
    expect(wrapper.classes()).toContain('obligation-list-item--settled')
    expect(wrapper.find('progress').exists()).toBe(false)
    expect(
      normalizeSpaces(
        wrapper.get('.obligation-list-item__settled-summary div:last-child dd').text(),
      ),
    ).toBe('6 000 ₽')
    expect(wrapper.text()).not.toContain('Добавить платёж')
  })
})

describe('ObligationList', () => {
  it('forwards the history event from its child to the page', async () => {
    const wrapper = mount(ObligationList, { props: { previews: [preview] } })

    await wrapper.get('button[aria-label="История платежей: Коммунальные услуги"]').trigger('click')

    expect(wrapper.emitted('showHistory')).toEqual([['utilities']])
  })
})

describe('PaymentHistoryDialog', () => {
  it('shows a separate payment with its date and emits close from the button', async () => {
    const wrapper = mount(PaymentHistoryDialog, { props: { preview } })
    const text = normalizeSpaces(wrapper.text())

    expect(wrapper.attributes('aria-labelledby')).toBe('payment-history-title')
    expect(wrapper.get('time').attributes('datetime')).toBe('2026-09-08')
    expect(text).toContain('8 сентября 2026')
    expect(text).toContain('Первый счёт')
    expect(text).toContain('Итого оплачено: 6 000 ₽')

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('AppDialog', () => {
  it('labels the modal and emits close from the close button', async () => {
    const wrapper = mount(AppDialog, {
      props: { title: 'Новый обязательный расход' },
      slots: { default: '<p>Форма</p>' },
      global: { stubs: { Teleport: true } },
    })

    const dialog = wrapper.get('dialog')
    expect(dialog.attributes('aria-labelledby')).toBe(wrapper.get('h3').attributes('id'))
    expect(wrapper.text()).toContain('Новый обязательный расход')

    await wrapper.get('button[aria-label="Закрыть окно"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})
