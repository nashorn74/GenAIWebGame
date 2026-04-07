import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Mock App's getUserId before importing CharacterSelect
vi.mock('../../App', () => ({
  getUserId: vi.fn(() => '1'),
  getCharId: vi.fn(),
}))

import CharacterSelect from '../CharacterSelect'
import * as AppModule from '../../App'

const mockChars = [
  { id: 1, name: 'Hero', job: 'warrior', level: 5 },
  { id: 2, name: 'Mage', job: 'mage', level: 3 },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/characters']}>
      <Routes>
        <Route path="/characters" element={<CharacterSelect />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/play" element={<div>Play Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(AppModule.getUserId).mockReturnValue('1')
})

describe('CharacterSelect', () => {
  it('renders title and slots', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockChars),
      }),
    )
    renderPage()
    expect(screen.getByText('Select Your Character')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
    })
  })

  it('shows empty slot with + New Character', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    )
    renderPage()
    await waitFor(() => {
      const newButtons = screen.getAllByText('+ New Character')
      expect(newButtons.length).toBe(3) // MAX_SLOT = 3
    })
  })

  it('shows character details in slot', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockChars),
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
      expect(screen.getByText('Lv.5 warrior')).toBeInTheDocument()
      expect(screen.getByText('Mage')).toBeInTheDocument()
      expect(screen.getByText('Lv.3 mage')).toBeInTheDocument()
    })
  })

  it('Start button is disabled when no character selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockChars),
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
    })
    expect(screen.getByText('Start with Selected')).toBeDisabled()
  })

  it('selects character and navigates to /play', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockChars),
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
    })

    // Click on the character card
    await user.click(screen.getByText('Hero'))
    await user.click(screen.getByText('Start with Selected'))

    expect(sessionStorage.getItem('charId')).toBe('1')
    expect(screen.getByText('Play Page')).toBeInTheDocument()
  })

  it('redirects to /login when not logged in', () => {
    vi.mocked(AppModule.getUserId).mockReturnValue(null)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    )
    renderPage()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('shows Edit and Delete buttons for each character', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockChars),
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2)
      expect(screen.getAllByText('Delete')).toHaveLength(2)
    })
  })
})
