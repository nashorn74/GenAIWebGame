import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboard from '../pages/AdminDashboard'
import * as api from '../api'

vi.mock('../api', () => ({
  fetchAdminOverview: vi.fn(),
}))

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchAdminOverview).mockResolvedValue({
      totalUsers: 12,
      bannedUsers: 2,
      totalCharacters: 30,
      highLevelCharacters: 4,
      totalItems: 20,
      potionItems: 8,
      totalMaps: 3,
      totalNPCs: 15,
      activeNPCs: 12,
      shopNPCs: 4,
    })
  })

  it('loads and renders overview metrics', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Live administration snapshot')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
    })
  })

  it('refreshes the overview when refresh is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(api.fetchAdminOverview).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(api.fetchAdminOverview).toHaveBeenCalledTimes(2)
    })
  })
})
