import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminMaps from '../pages/AdminMaps'
import * as api from '../api'

vi.mock('../api', () => ({
  fetchMaps: vi.fn(),
  createMap: vi.fn(),
  updateMap: vi.fn(),
  deleteMap: vi.fn(),
}))

const mockMaps = [
  { key: 'city1', display_name: 'Starting City', json_file: 'city1.json', tileset_file: 'tiles.png', tile_width: 32, tile_height: 32, width: 100, height: 100, map_data: '' },
  { key: 'forest1', display_name: 'Dark Forest', json_file: 'forest1.json', tileset_file: 'tiles.png', tile_width: 32, tile_height: 32, width: 200, height: 200, map_data: '' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchMaps).mockResolvedValue(mockMaps)
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})

describe('AdminMaps', () => {
  it('renders title and loads maps', async () => {
    render(<AdminMaps />)
    expect(screen.getByText('Map Management')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Starting City')).toBeInTheDocument()
      expect(screen.getByText('Dark Forest')).toBeInTheDocument()
    })
  })

  it('opens create dialog on + Create New Map click', async () => {
    const user = userEvent.setup()
    render(<AdminMaps />)
    await waitFor(() => {
      expect(screen.getByText('Starting City')).toBeInTheDocument()
    })

    await user.click(screen.getByText('+ Create New Map'))
    expect(screen.getByText('Create Map')).toBeInTheDocument()
  })

  it('opens edit dialog on Edit click', async () => {
    const user = userEvent.setup()
    render(<AdminMaps />)
    await waitFor(() => {
      expect(screen.getByText('Starting City')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    expect(screen.getByText('Edit Map')).toBeInTheDocument()
  })

  it('calls deleteMap on Delete click', async () => {
    vi.mocked(api.deleteMap).mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<AdminMaps />)
    await waitFor(() => {
      expect(screen.getByText('Starting City')).toBeInTheDocument()
    })

    const delButtons = screen.getAllByText('Delete')
    await user.click(delButtons[0])

    await waitFor(() => {
      expect(api.deleteMap).toHaveBeenCalledWith('city1')
    })
  })
})
