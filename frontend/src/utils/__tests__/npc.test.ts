import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('npc utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchNpcs returns NPC list', async () => {
    const npcs = [
      { id: 1, name: 'Guard', npc_type: 'normal', x: 5, y: 10 },
      { id: 2, name: 'Merchant', npc_type: 'shop', x: 10, y: 11 },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(npcs),
    })

    const { fetchNpcs } = await import('../npc')
    const result = await fetchNpcs('city2')
    expect(result).toHaveLength(2)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/npcs?map_key=city2'))
  })

  it('fetchNpcs throws on fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false })

    const { fetchNpcs } = await import('../npc')
    await expect(fetchNpcs('bad')).rejects.toThrow('npc fetch error')
  })
})
