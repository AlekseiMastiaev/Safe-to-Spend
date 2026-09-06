import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppHeader from '../AppHeader.vue'

describe('AppHeader', () => {
  it('renders the title passed by its parent', () => {
    const wrapper = mount(AppHeader, {
      props: { title: 'Safe to Spend' },
    })

    expect(wrapper.get('h1').text()).toBe('Safe to Spend')
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
