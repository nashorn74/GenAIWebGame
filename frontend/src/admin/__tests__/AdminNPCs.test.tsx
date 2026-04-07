import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminNPCs from '../pages/AdminNPCs'
import * as api from '../api'

vi.mock('../api', () => ({
  fetchNPCs: vi.fn(),
  createNPC: vi.fn(),
  updateNPC: vi.fn(),
  deleteNPC: vi.fn(),
}))

const mockNPCs = [
  { id: 1, name: 'Merchant', gender: 'male', race: 'human', job: 'trader', map_key: 'city1', x: 100, y: 200, dialog: 'Welcome!', is_active: true, npc_type: 'shop' },
  { id: 2, name: 'Guard', gender: 'male', race: 'elf', job: 'soldier', map_key: 'city1', x: 50, y: 50, dialog: 'Stay safe.', is_active: true, npc_type: 'normal' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchNPCs).mockResolvedValue(mockNPCs)
})

describe('AdminNPCs', () => {
  it('renders title and loads NPCs', async () => {
    render(<AdminNPCs />)
    expect(screen.getByText('NPC Management')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Merchant')).toBeInTheDocument()
      expect(screen.getByText('Guard')).toBeInTheDocument()
    })
  })

  it('filters NPCs by search', async () => {
    const user = userEvent.setup()
    render(<AdminNPCs />)
    await waitFor(() => {
      expect(screen.getByText('Merchant')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Search by Name'), 'Mer')
    expect(screen.getByText('Merchant')).toBeInTheDocument()
    expect(screen.queryByText('Guard')).not.toBeInTheDocument()
  })

  it('opens create dialog on + Create NPC click', async () => {
    const user = userEvent.setup()
    render(<AdminNPCs />)
    await waitFor(() => {
      expect(screen.getByText('Merchant')).toBeInTheDocument()
    })

    await user.click(screen.getByText('+ Create NPC'))
    expect(screen.getByText('Create NPC')).toBeInTheDocument()
  })

  it('opens edit dialog on Edit click', async () => {
    const user = userEvent.setup()
    render(<AdminNPCs />)
    await waitFor(() => {
      expect(screen.getByText('Merchant')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    expect(screen.getByText('Edit NPC')).toBeInTheDocument()
  })

  it('calls deleteNPC on Delete click', async () => {
    vi.mocked(api.deleteNPC).mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<AdminNPCs />)
    await waitFor(() => {
      expect(screen.getByText('Merchant')).toBeInTheDocument()
    })

    const delButtons = screen.getAllByText('Delete')
    await user.click(delButtons[0])

    await waitFor(() => {
      expect(api.deleteNPC).toHaveBeenCalledWith(1)
    })
  })
})
