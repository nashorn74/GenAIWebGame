import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminLogin from '../pages/AdminLogin'
import * as api from '../api'
import * as auth from '../auth'

vi.mock('../api', () => ({
  adminLogin: vi.fn(),
}))
vi.mock('../auth', () => ({
  isAdminAuthenticated: vi.fn(),
  setAdminAuthenticated: vi.fn(),
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/users" element={<div>Admin Users</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminLogin', () => {
  it('renders login form', () => {
    renderLogin()
    expect(screen.getByText('Admin Login')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  it('navigates to /admin/users on successful login', async () => {
    vi.mocked(api.adminLogin).mockResolvedValue({ admin: true })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'pass123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(api.adminLogin).toHaveBeenCalledWith('admin', 'pass123')
    expect(auth.setAdminAuthenticated).toHaveBeenCalledWith(true)
    expect(await screen.findByText('Admin Users')).toBeInTheDocument()
  })

  it('shows error message on login failure', async () => {
    vi.mocked(api.adminLogin).mockRejectedValue(new Error('Invalid credentials'))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('shows generic error when error has no message', async () => {
    vi.mocked(api.adminLogin).mockRejectedValue(new Error())
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'x')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(
      await screen.findByText('Network error or server not responding'),
    ).toBeInTheDocument()
  })
})
