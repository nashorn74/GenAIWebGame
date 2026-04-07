import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('admin api', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  // ── Auth ──

  describe('adminLogin', () => {
    it('returns data on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'ok' }),
      }))
      const { adminLogin } = await import('../api')
      const result = await adminLogin('admin', 'pass')
      expect(result).toEqual({ message: 'ok' })

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/auth/admin_login')
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body)).toEqual({ username: 'admin', password: 'pass' })
    })

    it('throws on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      }))
      const { adminLogin } = await import('../api')
      await expect(adminLogin('admin', 'wrong')).rejects.toThrow('Invalid credentials')
    })
  })

  // ── Users ──

  describe('fetchUsers', () => {
    it('returns user array', async () => {
      const mockUsers = [{ id: 1, username: 'user1' }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      }))
      const { fetchUsers } = await import('../api')
      const result = await fetchUsers()
      expect(result).toEqual(mockUsers)
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/users'))
    })
  })

  describe('fetchUserDetail', () => {
    it('returns user and characters', async () => {
      const mockUser = { id: 1, username: 'user1' }
      const mockChars = [{ id: 10, name: 'Hero' }]
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUser) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockChars) })
      )
      const { fetchUserDetail } = await import('../api')
      const result = await fetchUserDetail(1)
      expect(result).toEqual({ user: mockUser, characters: mockChars })
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/users/1'))
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/characters?user_id=1'))
    })

    it('throws on 404', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
      const { fetchUserDetail } = await import('../api')
      await expect(fetchUserDetail(999)).rejects.toThrow('User detail not found.')
    })
  })

  describe('banUser', () => {
    it('sends POST to ban endpoint', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'User banned' }),
      }))
      const { banUser } = await import('../api')
      const result = await banUser(1)
      expect(result).toEqual({ message: 'User banned' })

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/users/1/ban')
      expect(opts.method).toBe('POST')
    })

    it('throws on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot ban' }),
      }))
      const { banUser } = await import('../api')
      await expect(banUser(1)).rejects.toThrow('Cannot ban')
    })
  })

  describe('deleteUser', () => {
    it('sends DELETE request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
      const { deleteUser } = await import('../api')
      await deleteUser(1)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/users/1')
      expect(opts.method).toBe('DELETE')
    })

    it('throws on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
      const { deleteUser } = await import('../api')
      await expect(deleteUser(1)).rejects.toThrow('Failed to delete user')
    })
  })

  // ── Characters ──

  describe('fetchCharacters', () => {
    it('returns character array', async () => {
      const mockChars = [{ id: 1, name: 'Hero', level: 5 }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockChars),
      }))
      const { fetchCharacters } = await import('../api')
      const result = await fetchCharacters()
      expect(result).toEqual(mockChars)
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/characters'))
    })
  })

  describe('fetchCharacterDetail', () => {
    it('returns character detail', async () => {
      const mockChar = { id: 1, name: 'Hero', level: 10 }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockChar),
      }))
      const { fetchCharacterDetail } = await import('../api')
      const result = await fetchCharacterDetail(1)
      expect(result).toEqual(mockChar)
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/characters/1'))
    })

    it('throws on 404', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
      const { fetchCharacterDetail } = await import('../api')
      await expect(fetchCharacterDetail(999)).rejects.toThrow('Character detail not found.')
    })
  })

  describe('gainExp', () => {
    it('sends PATCH with amount', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'ok', character: { id: 1, level: 6 } }),
      }))
      const { gainExp } = await import('../api')
      const result = await gainExp(1, 150)
      expect(result.message).toBe('ok')

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/characters/1/gain_exp')
      expect(opts.method).toBe('PATCH')
      expect(JSON.parse(opts.body)).toEqual({ amount: 150 })
    })

    it('throws on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Not enough' }),
      }))
      const { gainExp } = await import('../api')
      await expect(gainExp(1, 150)).rejects.toThrow('Not enough')
    })
  })

  describe('deleteCharacter', () => {
    it('sends DELETE request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
      const { deleteCharacter } = await import('../api')
      await deleteCharacter(1)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/characters/1')
      expect(opts.method).toBe('DELETE')
    })
  })

  // ── Items ──

  describe('fetchItems', () => {
    it('fetches all items without category', async () => {
      const mockItems = [{ id: 1, name: 'Sword' }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockItems),
      }))
      const { fetchItems } = await import('../api')
      const result = await fetchItems()
      expect(result).toEqual(mockItems)
      expect((fetch as any).mock.calls[0][0]).not.toContain('?category=')
    })

    it('fetches items with category filter', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }))
      const { fetchItems } = await import('../api')
      await fetchItems('potion')
      expect((fetch as any).mock.calls[0][0]).toContain('?category=potion')
    })
  })

  describe('createItem', () => {
    it('sends POST with payload', async () => {
      const payload = { name: 'Potion', category: 'potion', buy_price: 50 }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, ...payload }),
      }))
      const { createItem } = await import('../api')
      const result = await createItem(payload)
      expect(result.name).toBe('Potion')

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/items')
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body)).toEqual(payload)
    })

    it('throws on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Duplicate name' }),
      }))
      const { createItem } = await import('../api')
      await expect(createItem({ name: 'Dup' })).rejects.toThrow('Duplicate name')
    })
  })

  describe('updateItem', () => {
    it('sends PUT with payload', async () => {
      const payload = { name: 'Big Potion', buy_price: 100 }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, ...payload }),
      }))
      const { updateItem } = await import('../api')
      await updateItem(1, payload)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/items/1')
      expect(opts.method).toBe('PUT')
      expect(JSON.parse(opts.body)).toEqual(payload)
    })
  })

  describe('deleteItem', () => {
    it('sends DELETE request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
      const { deleteItem } = await import('../api')
      await deleteItem(5)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/items/5')
      expect(opts.method).toBe('DELETE')
    })
  })

  // ── Maps ──

  describe('fetchMaps', () => {
    it('returns map array', async () => {
      const mockMaps = [{ key: 'worldmap', display_name: 'World' }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMaps),
      }))
      const { fetchMaps } = await import('../api')
      const result = await fetchMaps()
      expect(result).toEqual(mockMaps)
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/maps'))
    })
  })

  describe('createMap', () => {
    it('sends POST with payload', async () => {
      const payload = { key: 'dungeon1', display_name: 'Dungeon' }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      }))
      const { createMap } = await import('../api')
      await createMap(payload)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/maps')
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body)).toEqual(payload)
    })
  })

  describe('updateMap', () => {
    it('sends PUT with key in URL', async () => {
      const payload = { display_name: 'Updated World' }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ key: 'worldmap', ...payload }),
      }))
      const { updateMap } = await import('../api')
      await updateMap('worldmap', payload)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/maps/worldmap')
      expect(opts.method).toBe('PUT')
    })
  })

  describe('deleteMap', () => {
    it('sends DELETE with key in URL', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
      const { deleteMap } = await import('../api')
      await deleteMap('dungeon1')

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/maps/dungeon1')
      expect(opts.method).toBe('DELETE')
    })

    it('throws on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Map in use' }),
      }))
      const { deleteMap } = await import('../api')
      await expect(deleteMap('worldmap')).rejects.toThrow('Map in use')
    })
  })

  // ── NPCs ──

  describe('fetchNPCs', () => {
    it('returns NPC array', async () => {
      const mockNPCs = [{ id: 1, name: 'Guard' }]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNPCs),
      }))
      const { fetchNPCs } = await import('../api')
      const result = await fetchNPCs()
      expect(result).toEqual(mockNPCs)
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/npcs'))
    })
  })

  describe('createNPC', () => {
    it('sends POST with payload', async () => {
      const payload = { name: 'Merchant', npc_type: 'shop', map_key: 'city' }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, ...payload }),
      }))
      const { createNPC } = await import('../api')
      await createNPC(payload)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/npcs')
      expect(opts.method).toBe('POST')
      expect(JSON.parse(opts.body)).toEqual(payload)
    })
  })

  describe('updateNPC', () => {
    it('sends PUT with id in URL', async () => {
      const payload = { name: 'Updated Guard' }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, ...payload }),
      }))
      const { updateNPC } = await import('../api')
      await updateNPC(1, payload)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/npcs/1')
      expect(opts.method).toBe('PUT')
    })
  })

  describe('deleteNPC', () => {
    it('sends DELETE request', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
      const { deleteNPC } = await import('../api')
      await deleteNPC(3)

      const [url, opts] = (fetch as any).mock.calls[0]
      expect(url).toContain('/api/npcs/3')
      expect(opts.method).toBe('DELETE')
    })

    it('throws on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'NPC not found' }),
      }))
      const { deleteNPC } = await import('../api')
      await expect(deleteNPC(999)).rejects.toThrow('NPC not found')
    })
  })
})
