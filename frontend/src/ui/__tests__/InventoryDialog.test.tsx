import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InventoryDialog from '../InventoryDialog'
import * as itemsUtil from '../../utils/items'

vi.mock('../../utils/items', () => ({
  fetchInventory: vi.fn(),
  useItem: vi.fn(),
}))

const potionItem: itemsUtil.ItemDTO = {
  id: 1, name: 'Health Potion', category: 'potion',
  description: 'Restores 50 HP', buy_price: 100, sell_price: 50,
  effect_value: 50,
}

const weaponItem: itemsUtil.ItemDTO = {
  id: 2, name: 'Iron Sword', category: 'weapon',
  description: 'A basic sword', buy_price: 500, sell_price: 250,
  attack_power: 10,
}

const inventory: itemsUtil.CharItemDTO[] = [
  { id: 1, item_id: 1, quantity: 3, item: potionItem },
  { id: 2, item_id: 2, quantity: 1, item: weaponItem },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(itemsUtil.fetchInventory).mockResolvedValue(inventory)
})

describe('InventoryDialog', () => {
  const onClose = vi.fn()
  const onAfterUse = vi.fn()

  it('renders dialog title', async () => {
    render(
      <InventoryDialog open={true} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    expect(screen.getByText('인벤토리')).toBeInTheDocument()
  })

  it('loads and displays inventory items', async () => {
    render(
      <InventoryDialog open={true} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    await waitFor(() => {
      expect(screen.getByText('x3')).toBeInTheDocument()
      expect(screen.getByText('x1')).toBeInTheDocument()
    })
  })

  it('shows empty message when no items', async () => {
    vi.mocked(itemsUtil.fetchInventory).mockResolvedValue([])
    render(
      <InventoryDialog open={true} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    await waitFor(() => {
      expect(screen.getByText('보유한 아이템이 없습니다.')).toBeInTheDocument()
    })
  })

  it('shows potion use button when potion selected', async () => {
    const user = userEvent.setup()
    render(
      <InventoryDialog open={true} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    await waitFor(() => {
      expect(screen.getByText('x3')).toBeInTheDocument()
    })

    // Click potion avatar (first item)
    const avatars = screen.getAllByRole('img')
    await user.click(avatars[0])

    expect(screen.getByText('Health Potion')).toBeInTheDocument()
    expect(screen.getByText('Restores 50 HP')).toBeInTheDocument()
    expect(screen.getByText('사용 (HP 회복)')).toBeInTheDocument()
  })

  it('shows equip-not-ready message for non-potion items', async () => {
    const user = userEvent.setup()
    render(
      <InventoryDialog open={true} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    await waitFor(() => {
      expect(screen.getByText('x1')).toBeInTheDocument()
    })

    const avatars = screen.getAllByRole('img')
    await user.click(avatars[1])

    expect(screen.getByText('Iron Sword')).toBeInTheDocument()
    expect(screen.getByText('장착 기능은 준비 중입니다.')).toBeInTheDocument()
    expect(screen.queryByText('사용 (HP 회복)')).not.toBeInTheDocument()
  })

  it('calls useItem and refreshes on potion use', async () => {
    vi.mocked(itemsUtil.useItem).mockResolvedValue({
      message: 'HP 회복!', healed: 50, hp: 100,
    })
    vi.mocked(itemsUtil.fetchInventory)
      .mockResolvedValueOnce(inventory)
      .mockResolvedValueOnce([
        { id: 1, item_id: 1, quantity: 2, item: potionItem },
        { id: 2, item_id: 2, quantity: 1, item: weaponItem },
      ])

    const user = userEvent.setup()
    render(
      <InventoryDialog open={true} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    await waitFor(() => {
      expect(screen.getByText('x3')).toBeInTheDocument()
    })

    const avatars = screen.getAllByRole('img')
    await user.click(avatars[0])
    await user.click(screen.getByText('사용 (HP 회복)'))

    await waitFor(() => {
      expect(itemsUtil.useItem).toHaveBeenCalledWith(1, 1)
      expect(onAfterUse).toHaveBeenCalled()
      expect(screen.getByText('HP 회복!')).toBeInTheDocument()
    })
  })

  it('shows error on useItem failure', async () => {
    vi.mocked(itemsUtil.useItem).mockResolvedValue({
      error: 'HP가 이미 최대입니다',
    })
    vi.mocked(itemsUtil.fetchInventory).mockResolvedValue(inventory)

    const user = userEvent.setup()
    render(
      <InventoryDialog open={true} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    await waitFor(() => {
      expect(screen.getByText('x3')).toBeInTheDocument()
    })

    const avatars = screen.getAllByRole('img')
    await user.click(avatars[0])
    await user.click(screen.getByText('사용 (HP 회복)'))

    await waitFor(() => {
      expect(screen.getByText('HP가 이미 최대입니다')).toBeInTheDocument()
    })
  })

  it('does not load inventory when dialog is closed', () => {
    vi.mocked(itemsUtil.fetchInventory).mockClear()
    render(
      <InventoryDialog open={false} charId={1} onClose={onClose} onAfterUse={onAfterUse} />,
    )
    expect(itemsUtil.fetchInventory).not.toHaveBeenCalled()
  })
})
