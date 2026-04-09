import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PrivateRoute from '../PrivateRoute'
import * as api from '../api'
import * as auth from '../auth'

vi.mock('../api', () => ({
  fetchAdminSession: vi.fn(),
}))

vi.mock('../auth', () => ({
  setAdminAuthenticated: vi.fn(),
}))

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <div>Protected Content</div>
            </PrivateRoute>
          }
        />
        <Route path="/admin/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PrivateRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when the admin session is valid', async () => {
    vi.mocked(api.fetchAdminSession).mockResolvedValue({
      authenticated: true,
      admin: true,
      username: 'admin',
    })

    renderWithRouter('/admin/dashboard')

    expect(screen.getByText('Checking admin session…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(auth.setAdminAuthenticated).toHaveBeenCalledWith(true)
    })
  })

  it('redirects to /admin/login when the session is missing', async () => {
    vi.mocked(api.fetchAdminSession).mockResolvedValue({
      authenticated: false,
      admin: false,
    })

    renderWithRouter('/admin/dashboard')

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
      expect(auth.setAdminAuthenticated).toHaveBeenCalledWith(false)
    })
  })
})
