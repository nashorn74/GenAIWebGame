import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('items utils', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('fetchShopItems filters items with buy_price > 0', async () => {
    const allItems = [
      { id: 1, name: 'Sword', buy_price: 50, sell_price: 0 },
      { id: 2, name: 'Jelly', buy_price: 0, sell_price: 5 },
      { id: 3, name: 'Potion', buy_price: 10, sell_price: 0 },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(allItems),
    }))

    const { fetchShopItems } = await import('../items')
    const result = await fetchShopItems()
    expect(result).toHaveLength(2)
    expect(result.every(i => i.buy_price > 0)).toBe(true)
  })

  it('fetchInventory returns character items', async () => {
    const charData = {
      id: 1,
      items: [{ id: 10, item_id: 1, quantity: 3, item: { name: 'Sword' } }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(charData),
    }))

    const { fetchInventory } = await import('../items')
    const result = await fetchInventory(1)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(3)
  })

  it('buyItem sends correct POST body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok' }),
    }))

    const { buyItem } = await import('../items')
    await buyItem(10, 1, 5, 2)

    const [url, opts] = (fetch as any).mock.calls[0]
    expect(url).toContain('/api/shops/10/buy')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ character_id: 1, item_id: 5, quantity: 2 })
  })

  it('sellItem sends correct POST body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok' }),
    }))

    const { sellItem } = await import('../items')
    await sellItem(10, 1, 3, 4)

    const [url, opts] = (fetch as any).mock.calls[0]
    expect(url).toContain('/api/shops/10/sell')
    expect(JSON.parse(opts.body)).toEqual({ character_id: 1, item_id: 3, quantity: 4 })
  })
})
