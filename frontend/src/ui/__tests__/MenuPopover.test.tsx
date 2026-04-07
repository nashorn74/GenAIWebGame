import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MenuPopover from '../MenuPopover'

describe('MenuPopover', () => {
  const onToggleBgm = vi.fn()
  const onLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders menu button', () => {
    render(
      <MenuPopover bgmOn={true} onToggleBgm={onToggleBgm} onLogout={onLogout} />,
    )
    expect(screen.getByText('☰')).toBeInTheDocument()
  })

  it('does not show popover initially', () => {
    render(
      <MenuPopover bgmOn={true} onToggleBgm={onToggleBgm} onLogout={onLogout} />,
    )
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()
  })

  it('toggles popover on button click', async () => {
    const user = userEvent.setup()
    render(
      <MenuPopover bgmOn={true} onToggleBgm={onToggleBgm} onLogout={onLogout} />,
    )
    await user.click(screen.getByText('☰'))
    expect(screen.getByText('Logout')).toBeInTheDocument()
    expect(screen.getByText('BGM OFF')).toBeInTheDocument()

    await user.click(screen.getByText('☰'))
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()
  })

  it('shows BGM ON when bgmOn is false', async () => {
    const user = userEvent.setup()
    render(
      <MenuPopover bgmOn={false} onToggleBgm={onToggleBgm} onLogout={onLogout} />,
    )
    await user.click(screen.getByText('☰'))
    expect(screen.getByText('BGM ON')).toBeInTheDocument()
  })

  it('calls onToggleBgm when BGM button clicked', async () => {
    const user = userEvent.setup()
    render(
      <MenuPopover bgmOn={true} onToggleBgm={onToggleBgm} onLogout={onLogout} />,
    )
    await user.click(screen.getByText('☰'))
    await user.click(screen.getByText('BGM OFF'))
    expect(onToggleBgm).toHaveBeenCalled()
  })

  it('calls onLogout when Logout button clicked', async () => {
    const user = userEvent.setup()
    render(
      <MenuPopover bgmOn={true} onToggleBgm={onToggleBgm} onLogout={onLogout} />,
    )
    await user.click(screen.getByText('☰'))
    await user.click(screen.getByText('Logout'))
    expect(onLogout).toHaveBeenCalled()
  })
})
