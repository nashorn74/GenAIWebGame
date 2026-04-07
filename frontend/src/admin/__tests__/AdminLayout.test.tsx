import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminLayout from '../AdminLayout'
import * as auth from '../auth'

vi.mock('../auth', () => ({
  isAdminAuthenticated: vi.fn(),
  setAdminAuthenticated: vi.fn(),
}))

function renderLayout(path = '/admin/users') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
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
  it('renders Admin Panel title', () => {
    renderLayout()
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })

  it('renders all menu items', () => {
    renderLayout()
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('Character Management')).toBeInTheDocument()
    expect(screen.getByText('Map Management')).toBeInTheDocument()
    expect(screen.getByText('NPC Management')).toBeInTheDocument()
    expect(screen.getByText('Item Management')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('renders outlet content', () => {
    renderLayout('/admin/users')
    expect(screen.getByText('Users Page')).toBeInTheDocument()
  })

  it('calls setAdminAuthenticated(false) and navigates on logout', async () => {
    const user = userEvent.setup()
    renderLayout()
    await user.click(screen.getByText('Logout'))
    expect(auth.setAdminAuthenticated).toHaveBeenCalledWith(false)
    expect(screen.getByText('Login Redirect')).toBeInTheDocument()
  })
})
