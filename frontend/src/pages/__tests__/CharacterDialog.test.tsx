import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CharacterDialog from '../CharacterDialog'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('CharacterDialog', () => {
  const onSaved = vi.fn()
  const onCancel = vi.fn()

  it('renders New Character form when char is null', () => {
    render(
      <CharacterDialog userId={1} char={null} onSaved={onSaved} onCancel={onCancel} />,
    )
    expect(screen.getByText('New Character')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByText('Job')).toBeInTheDocument()
    expect(screen.getByText('Gender')).toBeInTheDocument()
    expect(screen.getByText('Hair Color')).toBeInTheDocument()
  })

  it('renders Edit Character form when char is provided', () => {
    const char = { id: 1, name: 'Hero', job: 'warrior', gender: 'female', hair_color: 'brown' }
    render(
      <CharacterDialog userId={1} char={char} onSaved={onSaved} onCancel={onCancel} />,
    )
    expect(screen.getByText('Edit Character')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Hero')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel clicked', async () => {
    const user = userEvent.setup()
    render(
      <CharacterDialog userId={1} char={null} onSaved={onSaved} onCancel={onCancel} />,
    )
    await user.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls POST on save for new character', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ character: { id: 1 } }),
    })
    vi.stubGlobal('fetch', mockFetch)
    const user = userEvent.setup()

    render(
      <CharacterDialog userId={1} char={null} onSaved={onSaved} onCancel={onCancel} />,
    )

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'NewHero')
    await user.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters'),
        expect.objectContaining({ method: 'POST' }),
      )
      expect(onSaved).toHaveBeenCalled()
    })
  })

  it('calls PUT on save for existing character', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ character: { id: 1 } }),
    })
    vi.stubGlobal('fetch', mockFetch)
    const user = userEvent.setup()
    const char = { id: 5, name: 'Old', job: 'warrior', gender: 'female', hair_color: 'brown' }

    render(
      <CharacterDialog userId={1} char={char} onSaved={onSaved} onCancel={onCancel} />,
    )
    await user.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/5'),
        expect.objectContaining({ method: 'PUT' }),
      )
    })
  })

  it('shows error on save failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Name too short' }),
      }),
    )
    const user = userEvent.setup()

    render(
      <CharacterDialog userId={1} char={null} onSaved={onSaved} onCancel={onCancel} />,
    )
    await user.click(screen.getByText('Save'))

    expect(await screen.findByText('Name too short')).toBeInTheDocument()
  })

  it('shows network error on fetch exception', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')))
    const user = userEvent.setup()

    render(
      <CharacterDialog userId={1} char={null} onSaved={onSaved} onCancel={onCancel} />,
    )
    await user.click(screen.getByText('Save'))

    expect(await screen.findByText('network error')).toBeInTheDocument()
  })
})
