import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from './session'
import type { User } from '@utpost/shared'

const mockUser: User = {
  id: 1,
  email: 'negar@test.com',
  display_name: 'Negar',
  role: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('useSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no user logged in', () => {
    const session = useSessionStore()
    expect(session.isLoggedIn).toBe(false)
    expect(session.user).toBeNull()
    expect(session.token).toBeNull()
  })

  it('logs in a user and stores their data', () => {
    const session = useSessionStore()
    session.login(mockUser, 'abc123')
    expect(session.isLoggedIn).toBe(true)
    expect(session.user).toEqual(mockUser)
    expect(session.token).toBe('abc123')
  })

  it('logs out a user and clears their data', () => {
    const session = useSessionStore()
    session.login(mockUser, 'abc123')
    session.logout()
    expect(session.isLoggedIn).toBe(false)
    expect(session.user).toBeNull()
    expect(session.token).toBeNull()
  })

  it('isLoggedIn is reactive — updates when user changes', () => {
    const session = useSessionStore()
    expect(session.isLoggedIn).toBe(false)
    session.login(mockUser, 'abc123')
    expect(session.isLoggedIn).toBe(true)
    session.logout()
    expect(session.isLoggedIn).toBe(false)
  })
})
