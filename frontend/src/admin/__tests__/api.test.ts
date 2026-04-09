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
        body: JSON.stringify({ username: 'admin', password: 'pass' }),
      }),
    )
  })

  it('adminLogin throws the API error message on failure', async () => {
    mockFetchSequence({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    })

    const { adminLogin } = await import('../api')
    await expect(adminLogin('admin', 'wrong')).rejects.toThrow('Invalid credentials')
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

  it('fetchAdminSession throws a fallback error for non-401 failures', async () => {
    mockFetchSequence({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('broken json')
      },
    })

    const { fetchAdminSession } = await import('../api')
    await expect(fetchAdminSession()).rejects.toThrow('Failed to verify admin session')
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

  it('fetchUserDetail throws a not-found error on 404', async () => {
    mockFetchSequence({
      ok: false,
      status: 404,
      json: async () => ({ error: 'missing' }),
    })

    const { fetchUserDetail } = await import('../api')
    await expect(fetchUserDetail(9)).rejects.toThrow('User detail not found.')
  })

  it('fetchUserDetail throws when loading characters fails', async () => {
    mockFetchSequence(
      { ok: true, json: async () => ({ id: 1, username: 'user1' }) },
      { ok: false, status: 500, json: async () => ({ error: 'boom' }) },
    )

    const { fetchUserDetail } = await import('../api')
    await expect(fetchUserDetail(1)).rejects.toThrow('Failed to load characters.')
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

  it('fetchCharacters includes credentials', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => [{ id: 1, name: 'Hero' }],
    })

    const { fetchCharacters } = await import('../api')
    await expect(fetchCharacters()).resolves.toEqual([{ id: 1, name: 'Hero' }])

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/characters'),
      expect.objectContaining({ credentials: 'include' }),
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

  it('gainExp surfaces API errors', async () => {
    mockFetchSequence({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid exp amount' }),
    })

    const { gainExp } = await import('../api')
    await expect(gainExp(1, -1)).rejects.toThrow('Invalid exp amount')
  })

  it('deleteCharacter sends DELETE with credentials', async () => {
    const fetchMock = mockFetchSequence({ ok: true, status: 204 })

    const { deleteCharacter } = await import('../api')
    await deleteCharacter(8)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/characters/8'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
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

  it('createItem surfaces API errors', async () => {
    mockFetchSequence({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Item name is required' }),
    })

    const { createItem } = await import('../api')
    await expect(createItem({})).rejects.toThrow('Item name is required')
  })

  it('updateItem sends PUT with the payload', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ item: { id: 3, name: 'Hi-Potion' } }),
    })

    const { updateItem } = await import('../api')
    await updateItem(3, { name: 'Hi-Potion' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/items/3'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ name: 'Hi-Potion' }),
      }),
    )
  })

  it('deleteItem sends DELETE with credentials', async () => {
    const fetchMock = mockFetchSequence({ ok: true, status: 204 })

    const { deleteItem } = await import('../api')
    await deleteItem(4)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/items/4'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('fetchMaps includes credentials', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => [{ key: 'worldmap' }],
    })

    const { fetchMaps } = await import('../api')
    await expect(fetchMaps()).resolves.toEqual([{ key: 'worldmap' }])

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/maps'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('createMap posts JSON payload', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ map: { key: 'city2' } }),
    })

    const { createMap } = await import('../api')
    await createMap({ key: 'city2', display_name: 'City 2' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/maps'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ key: 'city2', display_name: 'City 2' }),
      }),
    )
  })

  it('updateMap sends PUT with the payload', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ map: { key: 'city2' } }),
    })

    const { updateMap } = await import('../api')
    await updateMap('city2', { display_name: 'Capital City' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/maps/city2'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ display_name: 'Capital City' }),
      }),
    )
  })

  it('deleteMap sends DELETE with credentials', async () => {
    const fetchMock = mockFetchSequence({ ok: true, status: 204 })

    const { deleteMap } = await import('../api')
    await deleteMap('city2')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/maps/city2'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('fetchNPCs includes credentials', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => [{ id: 5, name: 'Merchant' }],
    })

    const { fetchNPCs } = await import('../api')
    await expect(fetchNPCs()).resolves.toEqual([{ id: 5, name: 'Merchant' }])

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/npcs'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('createNPC posts JSON payload', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ npc: { id: 2, name: 'Guide' } }),
    })

    const { createNPC } = await import('../api')
    await createNPC({ name: 'Guide', map_key: 'city2' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/npcs'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ name: 'Guide', map_key: 'city2' }),
      }),
    )
  })

  it('createNPC surfaces API errors', async () => {
    mockFetchSequence({
      ok: false,
      status: 400,
      json: async () => ({ error: 'NPC name is required' }),
    })

    const { createNPC } = await import('../api')
    await expect(createNPC({})).rejects.toThrow('NPC name is required')
  })

  it('updateNPC sends PUT with the payload', async () => {
    const fetchMock = mockFetchSequence({
      ok: true,
      json: async () => ({ npc: { id: 9, name: 'Guardian' } }),
    })

    const { updateNPC } = await import('../api')
    await updateNPC(9, { name: 'Guardian' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/npcs/9'),
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ name: 'Guardian' }),
      }),
    )
  })

  it('deleteNPC sends DELETE with credentials', async () => {
    const fetchMock = mockFetchSequence({ ok: true, status: 204 })

    const { deleteNPC } = await import('../api')
    await deleteNPC(9)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/npcs/9'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
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
