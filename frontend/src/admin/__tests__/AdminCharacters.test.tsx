import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminCharacters from '../pages/AdminCharacters'
import * as api from '../api'

vi.mock('../api', () => ({
  fetchCharacters: vi.fn(),
  fetchCharacterDetail: vi.fn(),
  gainExp: vi.fn(),
  deleteCharacter: vi.fn(),
}))

const mockChars = [
  { id: 1, name: 'Hero', user_id: 1, job: 'warrior', level: 5, exp: 200, hp: 100, max_hp: 120, mp: 50, max_mp: 50, map_key: 'city1', x: 0, y: 0, str: 10, dex: 5, intl: 3, gold: 500, status_effects: '' },
  { id: 2, name: 'Mage', user_id: 2, job: 'mage', level: 3, exp: 100, hp: 80, max_hp: 80, mp: 80, max_mp: 80, map_key: 'city1', x: 0, y: 0, str: 3, dex: 5, intl: 15, gold: 300, status_effects: '' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchCharacters).mockResolvedValue(mockChars)
})

describe('AdminCharacters', () => {
  it('renders title and loads characters', async () => {
    render(<AdminCharacters />)
    expect(screen.getByText('Character Management')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
      expect(screen.getByText('Mage')).toBeInTheDocument()
    })
  })

  it('filters characters by search', async () => {
    const user = userEvent.setup()
    render(<AdminCharacters />)
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Search (character name)'), 'Her')
    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.queryByText('Mage')).not.toBeInTheDocument()
  })

  it('opens detail dialog by clicking character name', async () => {
    vi.mocked(api.fetchCharacterDetail).mockResolvedValue(mockChars[0])
    const user = userEvent.setup()
    render(<AdminCharacters />)
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Hero'))

    await waitFor(() => {
      expect(api.fetchCharacterDetail).toHaveBeenCalledWith(1)
    })
  })
})
