import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../AdminLayout'
import PrivateRoute from '../PrivateRoute'
import AdminDashboard from '../pages/AdminDashboard'
import AdminLogin from '../pages/AdminLogin'
import * as api from '../api'
import * as auth from '../auth'

vi.mock('../api', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
  fetchAdminSession: vi.fn(),
  fetchAdminOverview: vi.fn(),
}))

vi.mock('../auth', () => ({
  setAdminAuthenticated: vi.fn(),
}))

function renderAdminApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Admin app flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.adminLogout).mockResolvedValue({ message: 'logged out' })
    vi.mocked(api.fetchAdminOverview).mockResolvedValue({
      totalUsers: 5,
      bannedUsers: 1,
      totalCharacters: 12,
      highLevelCharacters: 2,
      totalItems: 7,
      potionItems: 3,
      totalMaps: 2,
      totalNPCs: 8,
      activeNPCs: 6,
      shopNPCs: 2,
    })
  })

  it('redirects unauthenticated admin routes to the login page', async () => {
    vi.mocked(api.fetchAdminSession).mockResolvedValue({
      authenticated: false,
      admin: false,
    })

    renderAdminApp('/admin/dashboard')

    await waitFor(() => {
      expect(screen.getByText('Admin Login')).toBeInTheDocument()
    })
  })

  it('completes login and logout through the protected admin shell', async () => {
    vi.mocked(api.adminLogin).mockResolvedValue({ admin: true, message: 'ok' })
    vi.mocked(api.fetchAdminSession).mockResolvedValue({
      authenticated: true,
      admin: true,
      username: 'admin',
    })

    const user = userEvent.setup()
    renderAdminApp('/admin/login')

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'pass123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByText('Arkacia Admin Console')).toBeInTheDocument()
      expect(screen.getByText('Live administration snapshot')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(api.adminLogout).toHaveBeenCalled()
      expect(auth.setAdminAuthenticated).toHaveBeenCalledWith(false)
      expect(screen.getByText('Admin Login')).toBeInTheDocument()
    })
  })
})
