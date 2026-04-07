import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NpcDialog from '../NpcDialog'
import type { NpcDTO } from '../../utils/npc'

const shopNpc: NpcDTO = {
  id: 1,
  name: 'Merchant',
  job: 'trader',
  race: 'human',
  dialog: 'Welcome to my shop!',
  npc_type: 'shop',
  x: 100,
  y: 200,
}

const normalNpc: NpcDTO = {
  id: 2,
  name: 'Guard',
  job: 'soldier',
  race: 'elf',
  dialog: 'Stay safe, traveler.',
  npc_type: 'normal',
  x: 50,
  y: 50,
}

describe('NpcDialog', () => {
  const onClose = vi.fn()
  const onOpenShop = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when npc is null', () => {
    const { container } = render(
      <NpcDialog npc={null} onClose={onClose} onOpenShop={onOpenShop} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders npc name and dialog', () => {
    render(
      <NpcDialog npc={normalNpc} onClose={onClose} onOpenShop={onOpenShop} />,
    )
    expect(screen.getByText('Guard')).toBeInTheDocument()
    expect(screen.getByText('Stay safe, traveler.')).toBeInTheDocument()
    expect(screen.getByText(/soldier/)).toBeInTheDocument()
    expect(screen.getByText(/elf/)).toBeInTheDocument()
  })

  it('shows shop button for shop type npc', () => {
    render(
      <NpcDialog npc={shopNpc} onClose={onClose} onOpenShop={onOpenShop} />,
    )
    expect(screen.getByText('상점으로 이동')).toBeInTheDocument()
  })

  it('does not show shop button for normal npc', () => {
    render(
      <NpcDialog npc={normalNpc} onClose={onClose} onOpenShop={onOpenShop} />,
    )
    expect(screen.queryByText('상점으로 이동')).not.toBeInTheDocument()
  })

  it('calls onOpenShop when shop button clicked', async () => {
    const user = userEvent.setup()
    render(
      <NpcDialog npc={shopNpc} onClose={onClose} onOpenShop={onOpenShop} />,
    )
    await user.click(screen.getByText('상점으로 이동'))
    expect(onOpenShop).toHaveBeenCalledWith(shopNpc)
  })

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <NpcDialog npc={normalNpc} onClose={onClose} onOpenShop={onOpenShop} />,
    )
    await user.click(screen.getByText('닫기'))
    expect(onClose).toHaveBeenCalled()
  })
})
