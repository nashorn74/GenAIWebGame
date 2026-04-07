import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PrivateRoute from '../PrivateRoute'
import * as auth from '../auth'

vi.mock('../auth', () => ({
  isAdminAuthenticated: vi.fn(),
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
  it('renders children when authenticated', () => {
    vi.mocked(auth.isAdminAuthenticated).mockReturnValue(true)
    renderWithRouter('/admin/dashboard')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /admin/login when not authenticated', () => {
    vi.mocked(auth.isAdminAuthenticated).mockReturnValue(false)
    renderWithRouter('/admin/dashboard')
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
