import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '../stores/session'
import LoginView from './LoginView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: LoginView },
  ],
})

const mockUser = {
  id: 1,
  email: 'negar@test.com',
  display_name: 'Negar',
  role: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
}

const mountLoginView = () =>
  mount(LoginView, {
    global: {
      plugins: [router],
    },
  })

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('renders email and password inputs and a submit button', () => {
    const wrapper = mountLoginView()
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('shows an error message when login fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Ogiltiga uppgifter' }),
      }),
    )

    const wrapper = mountLoginView()
    await wrapper.find('input[type="email"]').setValue('wrong@test.com')
    await wrapper.find('input[type="password"]').setValue('wrongpass')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Ogiltiga uppgifter')
  })

  it('calls session.login with user and token on successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ user: mockUser, token: 'abc123' }),
      }),
    )

    const wrapper = mountLoginView()
    await wrapper.find('input[type="email"]').setValue('negar@test.com')
    await wrapper.find('input[type="password"]').setValue('correctpass')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const session = useSessionStore()
    expect(session.isLoggedIn).toBe(true)
    expect(session.user).toEqual(mockUser)
    expect(session.token).toBe('abc123')
  })

  it('does not show an error message on initial render', () => {
    const wrapper = mountLoginView()
    expect(wrapper.find('.error').exists()).toBe(false)
  })
})
