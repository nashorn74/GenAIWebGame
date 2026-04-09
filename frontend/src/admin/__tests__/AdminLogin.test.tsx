import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminLogin from '../pages/AdminLogin'
import * as api from '../api'
import * as auth from '../auth'

vi.mock('../api', () => ({
  adminLogin: vi.fn(),
}))

vi.mock('../auth', () => ({
  setAdminAuthenticated: vi.fn(),
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the upgraded login screen', () => {
    renderLogin()
    expect(screen.getByText('Admin Login')).toBeInTheDocument()
    expect(screen.getByText('Secure access for world management')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('navigates to the dashboard on successful login', async () => {
    vi.mocked(api.adminLogin).mockResolvedValue({ admin: true, message: 'ok' })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'pass123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(api.adminLogin).toHaveBeenCalledWith('admin', 'pass123')
    expect(auth.setAdminAuthenticated).toHaveBeenCalledWith(true)
    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('shows API errors on login failure', async () => {
    vi.mocked(api.adminLogin).mockRejectedValue(new Error('Invalid credentials'))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })
})
