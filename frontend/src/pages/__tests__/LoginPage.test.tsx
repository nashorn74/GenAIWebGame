import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LoginPage from '../LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/characters" element={<div>Character Select</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('renders login form with title', () => {
    renderLogin()
    expect(screen.getByText('Arkacia')).toBeInTheDocument()
    expect(screen.getByText('Login', { selector: 'h5' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('navigates to /characters on successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: 42 } }),
      }),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'testuser')
    await user.type(screen.getByLabelText('Password'), 'pass1234')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Character Select')).toBeInTheDocument()
    expect(sessionStorage.getItem('arkacia_token')).toBe('yes')
    expect(sessionStorage.getItem('userId')).toBe('42')
  })

  it('shows error on login failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid password' }),
      }),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'testuser')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Invalid password')).toBeInTheDocument()
  })

  it('shows network error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'u')
    await user.type(screen.getByLabelText('Password'), 'p')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('opens sign up dialog', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument()
  })

  it('registers successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'ok' }),
      }),
    )
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    const user = userEvent.setup()
    renderLogin()

    // Open sign up dialog
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    // Fill form fields inside dialog
    const dialog = screen.getByRole('dialog')
    const inputs = dialog.querySelectorAll('input')
    // inputs: Username, Password, Confirm Password, Email
    await user.type(inputs[0], 'newuser1')
    await user.type(inputs[1], 'pass1234')
    await user.type(inputs[2], 'pass1234')

    // Click Sign Up button inside dialog (DialogActions)
    const dialogButtons = dialog.querySelectorAll('button')
    const signUpBtn = Array.from(dialogButtons).find(b => b.textContent === 'Sign Up')!
    await user.click(signUpBtn)

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Registration success! Please login.',
      )
    })
  })

  it('shows register validation error when fields missing', async () => {
    const user = userEvent.setup()
    renderLogin()

    // Open sign up dialog
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    // Click Sign Up without filling anything
    const dialog = screen.getByRole('dialog')
    const dialogButtons = dialog.querySelectorAll('button')
    const signUpBtn = Array.from(dialogButtons).find(b => b.textContent === 'Sign Up')!
    await user.click(signUpBtn)

    expect(await screen.findByText('All fields required')).toBeInTheDocument()
  })

  it('shows register error from server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Username taken' }),
      }),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    const dialog = screen.getByRole('dialog')
    const inputs = dialog.querySelectorAll('input')
    await user.type(inputs[0], 'taken')
    await user.type(inputs[1], 'pass1234')
    await user.type(inputs[2], 'pass1234')

    const dialogButtons = dialog.querySelectorAll('button')
    const signUpBtn = Array.from(dialogButtons).find(b => b.textContent === 'Sign Up')!
    await user.click(signUpBtn)

    expect(await screen.findByText('Username taken')).toBeInTheDocument()
  })
})
