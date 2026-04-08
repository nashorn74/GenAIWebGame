import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminItems from '../pages/AdminItems'
import * as api from '../api'

vi.mock('../api', () => ({
  fetchItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}))

const mockItems = [
  { id: 1, name: 'Health Potion', category: 'potion', description: 'Heals HP', buy_price: 100, sell_price: 50, attack_power: 0, defense_power: 0, effect_value: 50 },
  { id: 2, name: 'Iron Sword', category: 'weapon', description: 'Basic sword', buy_price: 500, sell_price: 250, attack_power: 10, defense_power: 0, effect_value: 0 },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchItems).mockResolvedValue(mockItems)
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})

describe('AdminItems', () => {
  it('renders title and loads items', async () => {
    render(<AdminItems />)
    expect(screen.getByText('Item Management')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
      expect(screen.getByText('Iron Sword')).toBeInTheDocument()
    })
  })

  it('filters items by search', async () => {
    const user = userEvent.setup()
    render(<AdminItems />)
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })

    const searchFields = screen.getAllByLabelText('Search by Name')
    await user.type(searchFields[0], 'Iron')
    expect(screen.getByText('Iron Sword')).toBeInTheDocument()
    expect(screen.queryByText('Health Potion')).not.toBeInTheDocument()
  })

  it('opens create dialog on + Create Item click', async () => {
    const user = userEvent.setup()
    render(<AdminItems />)
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })

    await user.click(screen.getByText('+ Create Item'))
    expect(screen.getByText('Create Item')).toBeInTheDocument()
  })

  it('opens edit dialog on Edit click', async () => {
    const user = userEvent.setup()
    render(<AdminItems />)
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    expect(screen.getByText('Edit Item')).toBeInTheDocument()
  })

  it('calls deleteItem on Delete click', async () => {
    vi.mocked(api.deleteItem).mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<AdminItems />)
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
    })

    const delButtons = screen.getAllByText('Delete')
    await user.click(delButtons[0])

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith(1)
    })
  })

  it('reloads items with category filter when category changes', async () => {
    const potionOnly = [mockItems[0]]
    vi.mocked(api.fetchItems)
      .mockResolvedValueOnce(mockItems)     // initial load (no filter)
      .mockResolvedValueOnce(potionOnly)    // after selecting "potion"

    const user = userEvent.setup()
    render(<AdminItems />)
    await waitFor(() => {
      expect(screen.getByText('Iron Sword')).toBeInTheDocument()
    })

    // 첫 로드: 필터 없이 호출
    expect(api.fetchItems).toHaveBeenCalledWith(undefined)

    // Category 드롭다운에서 "potion" 선택
    // MUI Select는 jsdom에서 label 연결이 불안정하므로 role만으로 선택
    const categorySelect = screen.getByRole('combobox')
    await user.click(categorySelect)
    const potionOption = await screen.findByRole('option', { name: 'potion' })
    await user.click(potionOption)

    // useEffect([categoryFilter])에 의해 "potion" 필터로 재요청
    await waitFor(() => {
      expect(api.fetchItems).toHaveBeenCalledWith('potion')
    })

    // 결과에 potion만 표시
    await waitFor(() => {
      expect(screen.getByText('Health Potion')).toBeInTheDocument()
      expect(screen.queryByText('Iron Sword')).not.toBeInTheDocument()
    })
  })
})
