import { describe, it, expect, vi, beforeEach } from 'vitest'

// import.meta.env mock
vi.stubGlobal('import', { meta: { env: { VITE_API_BASE_URL: '' } } })

describe('character utils', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('getSelectedCharId returns null when no value', async () => {
    const { getSelectedCharId } = await import('../character')
    expect(getSelectedCharId()).toBeNull()
  })

  it('getSelectedCharId returns number from sessionStorage', async () => {
    sessionStorage.setItem('charId', '42')
    const { getSelectedCharId } = await import('../character')
    expect(getSelectedCharId()).toBe(42)
  })

  it('fetchCharacter calls correct endpoint', async () => {
    const mockData = { id: 1, name: 'Hero', level: 5 }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { fetchCharacter } = await import('../character')
    const result = await fetchCharacter(1)
    expect(result).toEqual(mockData)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/characters/1'))
  })

  it('fetchCharacter throws on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    const { fetchCharacter } = await import('../character')
    await expect(fetchCharacter(999)).rejects.toThrow('Failed to fetch character')
  })
})
