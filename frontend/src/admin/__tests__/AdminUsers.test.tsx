import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUsers from '../pages/AdminUsers'
import * as api from '../api'

vi.mock('../api', () => ({
  fetchUsers: vi.fn(),
  fetchUserDetail: vi.fn(),
  banUser: vi.fn(),
  deleteUser: vi.fn(),
}))

const mockUsers = [
  { id: 1, username: 'alice', email: 'alice@test.com', status: 'active', created_at: '2024-01-01' },
  { id: 2, username: 'bob', email: 'bob@test.com', status: 'active', created_at: '2024-01-02' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchUsers).mockResolvedValue(mockUsers)
})

describe('AdminUsers', () => {
  it('renders title and loads users', async () => {
    render(<AdminUsers />)
    expect(screen.getByText('User Management')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
      expect(screen.getByText('bob')).toBeInTheDocument()
    })
  })

  it('renders table headers', async () => {
    render(<AdminUsers />)
    await waitFor(() => {
      expect(screen.getByText('id')).toBeInTheDocument()
      expect(screen.getByText('username')).toBeInTheDocument()
      expect(screen.getByText('email')).toBeInTheDocument()
      expect(screen.getByText('status')).toBeInTheDocument()
    })
  })

  it('filters users by search term', async () => {
    const user = userEvent.setup()
    render(<AdminUsers />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Search (username/email)'), 'ali')
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.queryByText('bob')).not.toBeInTheDocument()
  })

  it('opens detail dialog by clicking username', async () => {
    vi.mocked(api.fetchUserDetail).mockResolvedValue({
      user: mockUsers[0],
      characters: [],
    })
    const user = userEvent.setup()
    render(<AdminUsers />)
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })

    await user.click(screen.getByText('alice'))

    await waitFor(() => {
      expect(api.fetchUserDetail).toHaveBeenCalledWith(1)
    })
  })
})
