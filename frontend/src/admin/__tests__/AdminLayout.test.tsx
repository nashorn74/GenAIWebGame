import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminLayout from '../AdminLayout'
import * as api from '../api'
import * as auth from '../auth'

vi.mock('../api', () => ({
  adminLogout: vi.fn(),
}))

vi.mock('../auth', () => ({
  setAdminAuthenticated: vi.fn(),
}))

function renderLayout(path = '/admin/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<div>Dashboard Page</div>} />
          <Route path="users" element={<div>Users Page</div>} />
          <Route path="characters" element={<div>Characters Page</div>} />
          <Route path="maps" element={<div>Maps Page</div>} />
          <Route path="npcs" element={<div>NPCs Page</div>} />
          <Route path="items" element={<div>Items Page</div>} />
        </Route>
        <Route path="/admin/login" element={<div>Login Redirect</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.adminLogout).mockResolvedValue({ message: 'ok' })
  })

  it('renders the admin shell and overview navigation item', () => {
    renderLayout()
    expect(screen.getByText('Arkacia Admin Console')).toBeInTheDocument()
    expect(screen.getByText('Control Room')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('shows the current page heading', () => {
    renderLayout('/admin/items')
    expect(screen.getByRole('heading', { name: 'Items' })).toBeInTheDocument()
    expect(screen.getByText('Items Page')).toBeInTheDocument()
  })

  it('logs out and redirects to the login route', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(api.adminLogout).toHaveBeenCalled()
      expect(auth.setAdminAuthenticated).toHaveBeenCalledWith(false)
      expect(screen.getByText('Login Redirect')).toBeInTheDocument()
    })
  })
})
