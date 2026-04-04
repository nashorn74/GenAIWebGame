import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('map utils', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('fetchMapData parses map_data JSON correctly', async () => {
    const serverResponse = {
      key: 'city2',
      display_name: 'Greenfield',
      tile_width: 128,
      tile_height: 128,
      map_data: JSON.stringify({
        start_position: [13, 2],
        teleports: [{ from: { x: 5, y: 0 }, to_map: 'worldmap', to_position: [10, 10] }],
      }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(serverResponse),
    }))

    const { fetchMapData } = await import('../map')
    const result = await fetchMapData('city2')
    expect(result.start_position).toEqual([13, 2])
    expect(result.teleports).toHaveLength(1)
    expect(result.teleports[0].to_map).toBe('worldmap')
  })

  it('fetchMapData defaults when map_data has no fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ key: 'empty', map_data: '{}' }),
    }))

    const { fetchMapData } = await import('../map')
    const result = await fetchMapData('empty')
    expect(result.start_position).toEqual([0, 0])
    expect(result.teleports).toEqual([])
  })

  it('fetchMapData throws on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const { fetchMapData } = await import('../map')
    await expect(fetchMapData('bad')).rejects.toThrow('map fetch err')
  })
})
