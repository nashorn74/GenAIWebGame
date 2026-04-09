import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../AdminLayout'
import PrivateRoute from '../PrivateRoute'
import AdminCharacters from '../pages/AdminCharacters'
import AdminDashboard from '../pages/AdminDashboard'
import AdminItems from '../pages/AdminItems'
import AdminLogin from '../pages/AdminLogin'
import AdminMaps from '../pages/AdminMaps'
import AdminNPCs from '../pages/AdminNPCs'
import AdminUsers from '../pages/AdminUsers'

type UserRecord = {
  id: number
  username: string
  email: string
  status: string
  bio: string
  created_at: string
}

type CharacterRecord = {
  id: number
  user_id: number
  name: string
  job: string
  level: number
  exp: number
  hp: number
  max_hp: number
  mp: number
  max_mp: number
  map_key: string
  x: number
  y: number
  str: number
  dex: number
  intl: number
  gold: number
  items?: Array<{ id: number; quantity: number; item?: { name: string } }>
  status_effects: string
}

type ItemRecord = {
  id: number
  name: string
  category: string
  description: string
  buy_price: number
  sell_price: number
  attack_power: number
  defense_power: number
  effect_value: number
}

type MapRecord = {
  key: string
  display_name: string
  json_file: string
  tileset_file: string
  tile_width: number
  tile_height: number
  width: number
  height: number
  map_data: string
}

type NpcRecord = {
  id: number
  name: string
  gender: string
  race: string
  job: string
  map_key: string
  x: number
  y: number
  dialog: string
  is_active: boolean
  npc_type: string
}

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response
}

function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    json: async () => undefined,
  } as Response
}

function createAdminBackend(options?: { sessionAuthenticated?: boolean; failUsersOnce?: boolean }) {
  let sessionAuthenticated = options?.sessionAuthenticated ?? false
  let failUsersOnce = options?.failUsersOnce ?? false

  const users: UserRecord[] = [
    {
      id: 1,
      username: 'playerone',
      email: 'player1@example.com',
      status: 'active',
      bio: 'Frontline tanker',
      created_at: '2026-04-01',
    },
    {
      id: 2,
      username: 'rangertwo',
      email: 'player2@example.com',
      status: 'active',
      bio: 'Always online',
      created_at: '2026-04-02',
    },
  ]

  const characters: CharacterRecord[] = [
    {
      id: 101,
      user_id: 1,
      name: 'KnightOne',
      job: 'warrior',
      level: 4,
      exp: 40,
      hp: 120,
      max_hp: 120,
      mp: 20,
      max_mp: 20,
      map_key: 'city2',
      x: 100,
      y: 200,
      str: 15,
      dex: 7,
      intl: 4,
      gold: 90,
      items: [{ id: 1, quantity: 2, item: { name: 'Starter Potion' } }],
      status_effects: '',
    },
    {
      id: 102,
      user_id: 2,
      name: 'RangerTwo',
      job: 'archer',
      level: 11,
      exp: 10,
      hp: 85,
      max_hp: 90,
      mp: 35,
      max_mp: 40,
      map_key: 'worldmap',
      x: 320,
      y: 512,
      str: 8,
      dex: 18,
      intl: 6,
      gold: 200,
      items: [],
      status_effects: 'focus',
    },
  ]

  const items: ItemRecord[] = [
    {
      id: 1,
      name: 'Starter Potion',
      category: 'potion',
      description: 'Small heal',
      buy_price: 10,
      sell_price: 5,
      attack_power: 0,
      defense_power: 0,
      effect_value: 30,
    },
    {
      id: 2,
      name: 'Bronze Sword',
      category: 'weapon',
      description: 'Basic training sword',
      buy_price: 60,
      sell_price: 25,
      attack_power: 7,
      defense_power: 0,
      effect_value: 0,
    },
  ]

  const maps: MapRecord[] = [
    {
      key: 'worldmap',
      display_name: 'World Map',
      json_file: 'worldmap.json',
      tileset_file: 'tmw_grass_spacing.png',
      tile_width: 128,
      tile_height: 128,
      width: 40,
      height: 30,
      map_data: '{"start_position":[6,12],"teleports":[]}',
    },
    {
      key: 'city2',
      display_name: 'Capital City',
      json_file: 'city2.json',
      tileset_file: 'tmw_city_spacing.png',
      tile_width: 128,
      tile_height: 128,
      width: 40,
      height: 30,
      map_data: '{"start_position":[10,8],"teleports":[]}',
    },
  ]

  const npcs: NpcRecord[] = [
    {
      id: 1,
      name: 'Merchant Lora',
      gender: 'female',
      race: 'Human',
      job: 'Merchant',
      map_key: 'city2',
      x: 80,
      y: 100,
      dialog: 'Buy something!',
      is_active: true,
      npc_type: 'shop',
    },
    {
      id: 2,
      name: 'Field Guide',
      gender: 'male',
      race: 'Human',
      job: 'Guide',
      map_key: 'worldmap',
      x: 10,
      y: 20,
      dialog: 'Stay alert.',
      is_active: true,
      npc_type: 'normal',
    },
  ]

  let nextItemId = 3
  let nextNpcId = 3

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString(), 'http://localhost')
    const path = `${url.pathname}${url.search}`
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined

    const ensureAdmin = () => {
      if (!sessionAuthenticated) {
        return jsonResponse({ error: 'Admin authentication required' }, 401)
      }
      return null
    }

    if (url.pathname === '/auth/admin_session' && method === 'GET') {
      return sessionAuthenticated
        ? jsonResponse({ authenticated: true, admin: true, username: 'admin' })
        : jsonResponse({ authenticated: false, admin: false }, 401)
    }

    if (url.pathname === '/auth/admin_login' && method === 'POST') {
      sessionAuthenticated = true
      return jsonResponse({ message: 'Admin login successful', admin: true })
    }

    if (url.pathname === '/auth/admin_logout' && method === 'POST') {
      sessionAuthenticated = false
      return jsonResponse({ message: 'Admin logged out' })
    }

    if (url.pathname === '/api/users' && method === 'GET') {
      if (failUsersOnce) {
        failUsersOnce = false
        return jsonResponse({ error: 'Temporary overview failure' }, 500)
      }
      return jsonResponse(users)
    }

    if (url.pathname === '/api/characters' && method === 'GET') {
      const userId = url.searchParams.get('user_id')
      if (userId) {
        return jsonResponse(characters.filter((character) => character.user_id === Number(userId)))
      }
      return jsonResponse(characters)
    }

    if (url.pathname === '/api/items' && method === 'GET') {
      const category = url.searchParams.get('category')
      return jsonResponse(category ? items.filter((item) => item.category === category) : items)
    }

    if (url.pathname === '/api/maps' && method === 'GET') {
      return jsonResponse(maps)
    }

    if (url.pathname === '/api/npcs' && method === 'GET') {
      return jsonResponse(npcs)
    }

    const userMatch = url.pathname.match(/^\/api\/users\/(\d+)$/)
    if (userMatch && method === 'GET') {
      const user = users.find((entry) => entry.id === Number(userMatch[1]))
      return user ? jsonResponse(user) : jsonResponse({ error: 'Not found' }, 404)
    }
    if (userMatch && method === 'DELETE') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const userId = Number(userMatch[1])
      const index = users.findIndex((entry) => entry.id === userId)
      if (index === -1) return jsonResponse({ error: 'Not found' }, 404)
      users.splice(index, 1)
      return noContentResponse()
    }

    const banMatch = url.pathname.match(/^\/api\/users\/(\d+)\/ban$/)
    if (banMatch && method === 'POST') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const user = users.find((entry) => entry.id === Number(banMatch[1]))
      if (!user) return jsonResponse({ error: 'Not found' }, 404)
      user.status = 'banned'
      return jsonResponse({ message: `User ${user.username} is now banned`, status: user.status })
    }

    const characterDetailMatch = url.pathname.match(/^\/api\/characters\/(\d+)$/)
    if (characterDetailMatch && method === 'GET') {
      const character = characters.find((entry) => entry.id === Number(characterDetailMatch[1]))
      return character ? jsonResponse(character) : jsonResponse({ error: 'Not found' }, 404)
    }
    if (characterDetailMatch && method === 'DELETE') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const characterId = Number(characterDetailMatch[1])
      const index = characters.findIndex((entry) => entry.id === characterId)
      if (index === -1) return jsonResponse({ error: 'Not found' }, 404)
      characters.splice(index, 1)
      return noContentResponse()
    }

    const gainExpMatch = url.pathname.match(/^\/api\/characters\/(\d+)\/gain_exp$/)
    if (gainExpMatch && method === 'PATCH') {
      const character = characters.find((entry) => entry.id === Number(gainExpMatch[1]))
      if (!character) return jsonResponse({ error: 'Not found' }, 404)
      const amount = Number(body?.amount ?? 0)
      character.exp += amount
      character.level += 1
      return jsonResponse({
        message: 'Experience granted',
        character: { ...character },
      })
    }

    if (url.pathname === '/api/items' && method === 'POST') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const item: ItemRecord = {
        id: nextItemId++,
        name: String(body?.name ?? ''),
        category: String(body?.category ?? 'drop'),
        description: String(body?.description ?? ''),
        buy_price: Number(body?.buy_price ?? 0),
        sell_price: Number(body?.sell_price ?? 0),
        attack_power: Number(body?.attack_power ?? 0),
        defense_power: Number(body?.defense_power ?? 0),
        effect_value: Number(body?.effect_value ?? 0),
      }
      items.push(item)
      return jsonResponse({ message: 'Item created', item }, 201)
    }

    const itemMatch = url.pathname.match(/^\/api\/items\/(\d+)$/)
    if (itemMatch && method === 'PUT') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const item = items.find((entry) => entry.id === Number(itemMatch[1]))
      if (!item) return jsonResponse({ error: 'Not found' }, 404)
      Object.assign(item, body)
      return jsonResponse({ message: 'Item updated', item })
    }
    if (itemMatch && method === 'DELETE') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const index = items.findIndex((entry) => entry.id === Number(itemMatch[1]))
      if (index === -1) return jsonResponse({ error: 'Not found' }, 404)
      items.splice(index, 1)
      return noContentResponse()
    }

    if (url.pathname === '/api/maps' && method === 'POST') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const map: MapRecord = {
        key: String(body?.key ?? ''),
        display_name: String(body?.display_name ?? ''),
        json_file: String(body?.json_file ?? ''),
        tileset_file: String(body?.tileset_file ?? ''),
        tile_width: Number(body?.tile_width ?? 128),
        tile_height: Number(body?.tile_height ?? 128),
        width: Number(body?.width ?? 40),
        height: Number(body?.height ?? 30),
        map_data: String(body?.map_data ?? '{}'),
      }
      maps.push(map)
      return jsonResponse({ message: 'Map created', map }, 201)
    }

    const mapMatch = url.pathname.match(/^\/api\/maps\/([^/]+)$/)
    if (mapMatch && method === 'PUT') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const map = maps.find((entry) => entry.key === mapMatch[1])
      if (!map) return jsonResponse({ error: 'Not found' }, 404)
      Object.assign(map, body)
      return jsonResponse({ message: 'Map updated', map })
    }
    if (mapMatch && method === 'DELETE') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const index = maps.findIndex((entry) => entry.key === mapMatch[1])
      if (index === -1) return jsonResponse({ error: 'Not found' }, 404)
      maps.splice(index, 1)
      return noContentResponse()
    }

    if (url.pathname === '/api/npcs' && method === 'POST') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const npc: NpcRecord = {
        id: nextNpcId++,
        name: String(body?.name ?? ''),
        gender: String(body?.gender ?? 'female'),
        race: String(body?.race ?? 'Human'),
        job: String(body?.job ?? 'Guard'),
        map_key: String(body?.map_key ?? 'worldmap'),
        x: Number(body?.x ?? 0),
        y: Number(body?.y ?? 0),
        dialog: String(body?.dialog ?? ''),
        is_active: Boolean(body?.is_active ?? true),
        npc_type: String(body?.npc_type ?? 'normal'),
      }
      npcs.push(npc)
      return jsonResponse({ message: 'NPC created', npc }, 201)
    }

    const npcMatch = url.pathname.match(/^\/api\/npcs\/(\d+)$/)
    if (npcMatch && method === 'PUT') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const npc = npcs.find((entry) => entry.id === Number(npcMatch[1]))
      if (!npc) return jsonResponse({ error: 'Not found' }, 404)
      Object.assign(npc, body)
      return jsonResponse({ message: 'NPC updated', npc })
    }
    if (npcMatch && method === 'DELETE') {
      const unauthorized = ensureAdmin()
      if (unauthorized) return unauthorized
      const index = npcs.findIndex((entry) => entry.id === Number(npcMatch[1]))
      if (index === -1) return jsonResponse({ error: 'Not found' }, 404)
      npcs.splice(index, 1)
      return noContentResponse()
    }

    throw new Error(`Unhandled request: ${method} ${path}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock }
}

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
          <Route path="users" element={<AdminUsers />} />
          <Route path="characters" element={<AdminCharacters />} />
          <Route path="maps" element={<AdminMaps />} />
          <Route path="npcs" element={<AdminNPCs />} />
          <Route path="items" element={<AdminItems />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

async function loginThroughUi(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Username'), 'admin')
  await user.type(screen.getByLabelText('Password'), 'admin')
  await user.click(screen.getByRole('button', { name: 'Login' }))

  await screen.findByText('Arkacia Admin Console')
}

describe('Admin app flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.spyOn(window, 'alert').mockImplementation(() => undefined)
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('redirects unauthenticated admin routes to the login page', async () => {
    createAdminBackend({ sessionAuthenticated: false })
    renderAdminApp('/admin/dashboard')

    await screen.findByText('Admin Login')
  })

  it('logs in, navigates across all admin pages, and logs out through the shell', async () => {
    createAdminBackend({ sessionAuthenticated: false })
    const user = userEvent.setup()
    renderAdminApp('/admin/login')

    await loginThroughUi(user)
    await screen.findByText('Live administration snapshot')

    await user.click(screen.getByRole('link', { name: /Users Review player accounts/i }))
    await screen.findByText('User Management')
    await screen.findByText('playerone')

    await user.click(screen.getByRole('link', { name: /Characters Audit progression and inventories/i }))
    await screen.findByText('Character Management')
    await screen.findByText('KnightOne')

    await user.click(screen.getByRole('link', { name: /Maps Manage world metadata/i }))
    await screen.findByText('Map Management')
    await screen.findByText('Capital City')

    await user.click(screen.getByRole('link', { name: /NPCs Control NPC placement and roles/i }))
    await screen.findByText('NPC Management')
    await screen.findByText('Merchant Lora')

    await user.click(screen.getByRole('link', { name: /Items Tune economy and balance/i }))
    await screen.findByText('Item Management')
    await screen.findByText('Starter Potion')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByText('Admin Login')
  })

  it('creates, updates, and deletes an item from the integrated admin shell', async () => {
    const backend = createAdminBackend({ sessionAuthenticated: true })
    const user = userEvent.setup()
    renderAdminApp('/admin/items')

    await screen.findByText('Item Management')
    await screen.findByText('Starter Potion')

    await user.click(screen.getByRole('button', { name: '+ Create Item' }))
    await user.type(screen.getByLabelText('Name'), 'Mega Potion')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await screen.findByText('Mega Potion')

    const newRow = screen.getByText('Mega Potion').closest('tr')
    expect(newRow).not.toBeNull()

    await user.click(within(newRow!).getByText('Edit'))
    const nameInput = screen.getByLabelText('Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Mega Elixir')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await screen.findByText('Mega Elixir')

    const editedRow = screen.getByText('Mega Elixir').closest('tr')
    expect(editedRow).not.toBeNull()

    await user.click(within(editedRow!).getByText('Delete'))

    await waitFor(() => {
      expect(backend.fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/3'),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    await user.click(screen.getByRole('link', { name: /Overview Summary and quick actions/i }))
    await screen.findByText('Live administration snapshot')
    await user.click(screen.getByRole('link', { name: /Items Tune economy and balance/i }))
    await screen.findByText('Item Management')

    await waitFor(() => {
      expect(screen.queryByText('Mega Elixir')).not.toBeInTheDocument()
    })
  })

  it('opens user details and bans the selected account', async () => {
    createAdminBackend({ sessionAuthenticated: true })
    const user = userEvent.setup()
    renderAdminApp('/admin/users')

    await screen.findByText('User Management')
    await user.click(screen.getByRole('button', { name: 'playerone' }))

    await screen.findByText('User Detail - playerone')
    await screen.findByText('Bio: Frontline tanker')
    await screen.findByText('KnightOne')

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByText('User Detail - playerone')).not.toBeInTheDocument()
    })

    const row = screen.getByText('playerone').closest('tr')
    expect(row).not.toBeNull()

    await user.click(within(row!).getByText('Ban'))

    await waitFor(() => {
      expect(within(row!).getByText('banned')).toBeInTheDocument()
    })
  })

  it('grants experience to a character and updates the list view', async () => {
    createAdminBackend({ sessionAuthenticated: true })
    const user = userEvent.setup()
    renderAdminApp('/admin/characters')

    await screen.findByText('Character Management')
    const row = screen.getByText('KnightOne').closest('tr')
    expect(row).not.toBeNull()
    expect(within(row!).getByText('4')).toBeInTheDocument()

    await user.click(within(row!).getByRole('button', { name: '+150 EXP' }))

    await waitFor(() => {
      expect(within(row!).getByText('5')).toBeInTheDocument()
    })
  })

  it('shows a recoverable dashboard error and reloads successfully after refresh', async () => {
    createAdminBackend({ sessionAuthenticated: true, failUsersOnce: true })
    const user = userEvent.setup()
    renderAdminApp('/admin/dashboard')

    await screen.findByText('Temporary overview failure')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(screen.getByText('Live administration snapshot')).toBeInTheDocument()
      expect(screen.getByText('No restricted accounts detected.')).toBeInTheDocument()
    })
  })
})
