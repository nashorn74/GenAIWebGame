import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    localStorage.setItem('isAdminLoggedIn', 'true')
    const { isAdminAuthenticated } = await import('../auth')
    expect(isAdminAuthenticated()).toBe(true)
  })

  it('isAdminAuthenticated returns false for non-true values', async () => {
    localStorage.setItem('isAdminLoggedIn', 'false')
    const { isAdminAuthenticated } = await import('../auth')
    expect(isAdminAuthenticated()).toBe(false)
  })

  it('setAdminAuthenticated(true) sets localStorage', async () => {
    const { setAdminAuthenticated } = await import('../auth')
    setAdminAuthenticated(true)
    expect(localStorage.getItem('isAdminLoggedIn')).toBe('true')
  })

  it('setAdminAuthenticated(false) removes localStorage', async () => {
    localStorage.setItem('isAdminLoggedIn', 'true')
    const { setAdminAuthenticated } = await import('../auth')
    setAdminAuthenticated(false)
    expect(localStorage.getItem('isAdminLoggedIn')).toBeNull()
  })
})
