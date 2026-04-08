import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShopDialog from '../ShopDialog'
import type { NpcDTO } from '../../utils/npc'
import * as itemsUtil from '../../utils/items'

vi.mock('../../utils/items', () => ({
  fetchShopItems: vi.fn(),
  fetchInventory: vi.fn(),
  buyItem: vi.fn(),
  sellItem: vi.fn(),
}))

const shopNpc: NpcDTO = {
  id: 10,
  name: 'Merchant',
  job: 'trader',
  race: 'human',
  dialog: 'Buy something!',
  npc_type: 'shop',
  x: 0,
  y: 0,
}

const shopItems: itemsUtil.ItemDTO[] = [
  {
    id: 1, name: 'Health Potion', category: 'potion',
    description: 'Heals 50 HP', buy_price: 100, sell_price: 50,
    effect_value: 50,
  },
  {
    id: 2, name: 'Iron Sword', category: 'weapon',
    description: 'A basic sword', buy_price: 500, sell_price: 250,
    attack_power: 10,
  },
]

const inventory: itemsUtil.CharItemDTO[] = [
  {
    id: 1, item_id: 1, quantity: 3,
    item: shopItems[0],
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(itemsUtil.fetchShopItems).mockResolvedValue(shopItems)
  vi.mocked(itemsUtil.fetchInventory).mockResolvedValue(inventory)
})

describe('ShopDialog', () => {
  const onClose = vi.fn()
  const onAfterTrade = vi.fn()

  it('renders nothing when npc is null', () => {
    const { container } = render(
      <ShopDialog
        npc={null} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('renders shop dialog with npc name and gold', async () => {
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText(/Merchant/)).toBeInTheDocument()
      expect(screen.getByText(/1,000 G/)).toBeInTheDocument()
    })
  })

  it('loads and displays shop items on buy tab', async () => {
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
      expect(screen.getByText('Iron Sword')).toBeInTheDocument()
    })
  })

  it('switches to sell tab and shows inventory', async () => {
    const user = userEvent.setup()
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: '판매' }))
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
      expect(screen.getByText(/x3/)).toBeInTheDocument()
    })
  })

  it('shows item detail when selected', async () => {
    const user = userEvent.setup()
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Health Potion'))
    expect(screen.getByText('Heals 50 HP')).toBeInTheDocument()
  })

  it('calls buyItem on buy trade', async () => {
    vi.mocked(itemsUtil.buyItem).mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Health Potion'))
    await user.click(screen.getByRole('button', { name: /구매/ }))

    await waitFor(() => {
      expect(itemsUtil.buyItem).toHaveBeenCalledWith(10, 1, 1, 1)
      expect(onAfterTrade).toHaveBeenCalled()
    })
  })

  it('shows placeholder text when no item selected', async () => {
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('아이템을 선택하세요')).toBeInTheDocument()
    })
  })

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText(/Merchant/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('닫기'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error message and hides spinner when initial load fails', async () => {
    vi.mocked(itemsUtil.fetchShopItems).mockRejectedValue(new Error('500'))
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={1000}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('상점 데이터를 불러올 수 없습니다.')).toBeInTheDocument()
    })
    // 스피너가 사라졌는지 확인 (loading=false)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows error message on trade error response', async () => {
    vi.mocked(itemsUtil.buyItem).mockResolvedValue({ error: '골드 부족' })
    const user = userEvent.setup()
    render(
      <ShopDialog
        npc={shopNpc} charId={1} charGold={100}
        onClose={onClose} onAfterTrade={onAfterTrade}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Health Potion'))
    await user.click(screen.getByRole('button', { name: /구매/ }))

    await waitFor(() => {
      expect(screen.getByText('골드 부족')).toBeInTheDocument()
    })
  })
})
