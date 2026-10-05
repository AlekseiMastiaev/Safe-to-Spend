import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppHeader from '../AppHeader.vue'
import AppLoader from '../AppLoader.vue'
import MobileBottomNavigation from '../MobileBottomNavigation.vue'
import { navigationItems } from '@/router/navigation'

describe('AppHeader', () => {
  it('renders the title passed by its parent', () => {
    const wrapper = mount(AppHeader, {
      props: { title: 'Safe to Spend' },
    })

    expect(wrapper.get('h1').text()).toBe('Safe to Spend')
    expect(wrapper.get('img').attributes('src')).toContain('favicon.svg')
    wrapper.unmount()
  })

  it('updates the heading when the parent changes the title', async () => {
    const wrapper = mount(AppHeader, {
      props: { title: 'Safe to Spend' },
    })

    await wrapper.setProps({ title: 'Monthly budget' })

    expect(wrapper.get('h1').text()).toBe('Monthly budget')
    wrapper.unmount()
  })
})

describe('AppLoader', () => {
  it('shows the product brand and announces the current startup stage', () => {
    const wrapper = mount(AppLoader, {
      props: { message: 'Открываем локальные данные…' },
    })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-live')).toBe('polite')
    expect(wrapper.text()).toContain('Safe to Spend')
    expect(wrapper.text()).toContain('Открываем локальные данные…')
    expect(wrapper.get('img').attributes('src')).toContain('favicon.svg')
  })
})

describe('MobileBottomNavigation', () => {
  it('uses a labelled settings icon instead of the abbreviated text', () => {
    const wrapper = mount(MobileBottomNavigation, {
      props: { items: navigationItems },
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    const settingsLink = wrapper.get('[aria-label="Настройки"]')
    expect(settingsLink.text()).toBe('')
    expect(settingsLink.find('.app-icon').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Настр.')
  })
})
