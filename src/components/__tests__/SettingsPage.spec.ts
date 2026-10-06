import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from '@/views/SettingsPage.vue'

describe('SettingsPage', () => {
  it('asks for explicit confirmation in a modal before resetting data', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const wrapper = mount(SettingsPage, {
      global: {
        plugins: [createPinia()],
        stubs: { Teleport: true },
      },
    })

    const resetButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Удалить все данные')
    expect(resetButton).toBeDefined()
    await resetButton!.trigger('click')

    expect(wrapper.get('dialog').text()).toContain('Это действие необратимо')
    expect(wrapper.text()).toContain('Да, удалить')
    expect(wrapper.text()).toContain('Нет, оставить')
    expect(confirmSpy).not.toHaveBeenCalled()

    const cancelButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Нет, оставить')
    expect(cancelButton).toBeDefined()
    await cancelButton!.trigger('click')

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(confirmSpy).not.toHaveBeenCalled()

    wrapper.unmount()
    confirmSpy.mockRestore()
  })
})
