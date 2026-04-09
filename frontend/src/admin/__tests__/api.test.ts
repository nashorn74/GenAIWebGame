import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockResponse = {
  ok: boolean
  status?: number
  json?: () => Promise<unknown>
}

function mockFetchSequence(...responses: MockResponse[]) {
  const fetchMock = vi.fn()
  responses.forEach((response) => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: async () => ({}),
      ...response,
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('admin api', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('adminLogin posts credentials with cookies included', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ message: 'ok', admin: true }),
    })

    const { adminLogin } = await import('../api')
    await expect(adminLogin('admin', 'pass')).resolves.toEqual({ message: 'ok', admin: true })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/admin_login'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
  })

  it('adminLogout posts to the logout endpoint', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ message: 'logged out' }),
    })

    const { adminLogout } = await import('../api')
    await expect(adminLogout()).resolves.toEqual({ message: 'logged out' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/admin_logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('fetchAdminSession returns unauthenticated on 401', async () => {
    mockFetchSequence({
      ok: false,
      status: 401,
      json: async () => ({ authenticated: false }),
    })

    const { fetchAdminSession } = await import('../api')
    await expect(fetchAdminSession()).resolves.toEqual({
      authenticated: false,
      admin: false,
    })
  })

  it('fetchUsers includes credentials', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => [{ id: 1, username: 'user1' }],
    })

    const { fetchUsers } = await import('../api')
    await expect(fetchUsers()).resolves.toEqual([{ id: 1, username: 'user1' }])

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('fetchUserDetail combines user and character requests', async () => {
    mockFetchSequence(
      { ok: true, json: async () => ({ id: 1, username: 'user1' }) },
      { ok: true, json: async () => [{ id: 10, name: 'Hero' }] },
    )

    const { fetchUserDetail } = await import('../api')
    await expect(fetchUserDetail(1)).resolves.toEqual({
      user: { id: 1, username: 'user1' },
      characters: [{ id: 10, name: 'Hero' }],
    })
  })

  it('banUser surfaces API errors', async () => {
    mockFetchSequence({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Cannot ban' }),
    })

    const { banUser } = await import('../api')
    await expect(banUser(1)).rejects.toThrow('Cannot ban')
  })

  it('deleteUser sends DELETE with credentials', async () => {
    const fetchMock = mockFetchSequence({ ok: true, status: 204 })

    const { deleteUser } = await import('../api')
    await deleteUser(1)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/1'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('fetchCharacterDetail throws a not-found message on 404', async () => {
    mockFetchSequence({
      ok: false,
      status: 404,
      json: async () => ({ error: 'missing' }),
    })

    const { fetchCharacterDetail } = await import('../api')
    await expect(fetchCharacterDetail(999)).rejects.toThrow('Character detail not found.')
  })

  it('gainExp posts the amount payload', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ message: 'ok', character: { id: 1, level: 6 } }),
    })

    const { gainExp } = await import('../api')
    await gainExp(1, 150)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/characters/1/gain_exp'),
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ amount: 150 }),
      }),
    )
  })

  it('fetchItems appends the category query string when provided', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => [],
    })

    const { fetchItems } = await import('../api')
    await fetchItems('potion')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/items?category=potion'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('createItem posts JSON payload', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ id: 1, name: 'Potion' }),
    })

    const { createItem } = await import('../api')
    await createItem({ name: 'Potion' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/items'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ name: 'Potion' }),
      }),
    )
  })

  it('fetchAdminOverview aggregates counts from admin resources', async () => {
    mockFetchSequence(
      { ok: true, json: async () => [{ id: 1, status: 'active' }, { id: 2, status: 'banned' }] },
      { ok: true, json: async () => [{ id: 10, level: 12 }, { id: 11, level: 4 }] },
      { ok: true, json: async () => [{ id: 100, category: 'potion' }, { id: 101, category: 'weapon' }] },
      { ok: true, json: async () => [{ key: 'worldmap' }] },
      { ok: true, json: async () => [{ id: 50, is_active: true, npc_type: 'shop' }, { id: 51, is_active: false, npc_type: 'normal' }] },
    )

    const { fetchAdminOverview } = await import('../api')
    await expect(fetchAdminOverview()).resolves.toEqual({
      totalUsers: 2,
      bannedUsers: 1,
      totalCharacters: 2,
      highLevelCharacters: 1,
      totalItems: 2,
      potionItems: 1,
      totalMaps: 1,
      totalNPCs: 2,
      activeNPCs: 1,
      shopNPCs: 1,
    })
  })
})
