import { describe, it, expect, vi, beforeEach } from 'vitest'

const ADMIN_AUTH_KEY = 'arkacia_admin_authenticated'

describe('admin auth utils', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('isAdminAuthenticated returns false when not logged in', async () => {
    const { isAdminAuthenticated } = await import('../auth')
    expect(isAdminAuthenticated()).toBe(false)
  })

  it('isAdminAuthenticated returns true when logged in', async () => {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true')
    const { isAdminAuthenticated } = await import('../auth')
    expect(isAdminAuthenticated()).toBe(true)
  })

  it('isAdminAuthenticated returns false for non-true values', async () => {
    localStorage.setItem(ADMIN_AUTH_KEY, 'false')
    const { isAdminAuthenticated } = await import('../auth')
    expect(isAdminAuthenticated()).toBe(false)
  })

  it('setAdminAuthenticated(true) sets localStorage', async () => {
    const { setAdminAuthenticated } = await import('../auth')
    setAdminAuthenticated(true)
    expect(localStorage.getItem(ADMIN_AUTH_KEY)).toBe('true')
  })

  it('setAdminAuthenticated(false) removes localStorage', async () => {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true')
    const { setAdminAuthenticated } = await import('../auth')
    setAdminAuthenticated(false)
    expect(localStorage.getItem(ADMIN_AUTH_KEY)).toBeNull()
  })
})
