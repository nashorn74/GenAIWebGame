const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

type JsonBody = Record<string, unknown>

export interface AdminSessionDTO {
  authenticated: boolean
  admin: boolean
  username?: string
}

export interface AdminOverviewDTO {
  totalUsers: number
  bannedUsers: number
  totalCharacters: number
  highLevelCharacters: number
  totalItems: number
  potionItems: number
  totalMaps: number
  totalNPCs: number
  activeNPCs: number
  shopNPCs: number
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error
  }
  return fallback
}

async function parseError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json()
    return new Error(getErrorMessage(data, fallback))
  } catch {
    return new Error(fallback)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
  })

  if (!response.ok) {
    throw await parseError(response, `Request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function requestWithoutBody(path: string, fallback: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw await parseError(response, fallback)
  }
  return response.json()
}

async function sendJson<T>(path: string, method: string, payload?: JsonBody): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  })
}

export async function adminLogin(username: string, password: string) {
  return sendJson<{ message: string; admin: boolean }>('/auth/admin_login', 'POST', {
    username,
    password,
  })
}

export async function adminLogout() {
  return sendJson<{ message: string }>('/auth/admin_logout', 'POST')
}

export async function fetchAdminSession(): Promise<AdminSessionDTO> {
  const response = await fetch(`${BASE_URL}/auth/admin_session`, {
    credentials: 'include',
  })

  if (response.status === 401) {
    return {
      authenticated: false,
      admin: false,
    }
  }

  if (!response.ok) {
    throw await parseError(response, 'Failed to verify admin session')
  }

  return response.json()
}

export async function fetchUsers() {
  return requestWithoutBody('/api/users', 'Failed to fetch users')
}

export async function fetchUserDetail(id: number) {
  const userResponse = await fetch(`${BASE_URL}/api/users/${id}`, {
    credentials: 'include',
  })

  if (userResponse.status === 404) {
    throw new Error('User detail not found.')
  }

  if (!userResponse.ok) {
    throw await parseError(userResponse, 'Failed to load user detail.')
  }

  const user = await userResponse.json()

  const characters = await request(`/api/characters?user_id=${id}`, {
    credentials: 'include',
  }).catch(() => {
    throw new Error('Failed to load characters.')
  })

  return { user, characters }
}

export async function banUser(id: number) {
  return sendJson(`/api/users/${id}/ban`, 'POST')
}

export async function deleteUser(id: number) {
  await request(`/api/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function fetchCharacters() {
  return requestWithoutBody('/api/characters', 'Failed to fetch characters')
}

export async function fetchCharacterDetail(id: number) {
  const response = await fetch(`${BASE_URL}/api/characters/${id}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Character detail not found.' : 'Failed to load character detail.')
  }
  return response.json()
}

export async function gainExp(id: number, amount: number) {
  return sendJson(`/api/characters/${id}/gain_exp`, 'PATCH', { amount })
}

export async function deleteCharacter(id: number) {
  await request(`/api/characters/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function fetchItems(category?: string) {
  let url = '/api/items'
  if (category) {
    url += `?category=${encodeURIComponent(category)}`
  }
  return requestWithoutBody(url, 'Failed to fetch items')
}

export async function createItem(payload: JsonBody) {
  return sendJson('/api/items', 'POST', payload)
}

export async function updateItem(id: number, payload: JsonBody) {
  return sendJson(`/api/items/${id}`, 'PUT', payload)
}

export async function deleteItem(id: number) {
  await request(`/api/items/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function fetchMaps() {
  return requestWithoutBody('/api/maps', 'Failed to fetch maps')
}

export async function createMap(payload: JsonBody) {
  return sendJson('/api/maps', 'POST', payload)
}

export async function updateMap(key: string, payload: JsonBody) {
  return sendJson(`/api/maps/${key}`, 'PUT', payload)
}

export async function deleteMap(key: string) {
  await request(`/api/maps/${key}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function fetchNPCs() {
  return requestWithoutBody('/api/npcs', 'Failed to fetch NPCs')
}

export async function createNPC(payload: JsonBody) {
  return sendJson('/api/npcs', 'POST', payload)
}

export async function updateNPC(id: number, payload: JsonBody) {
  return sendJson(`/api/npcs/${id}`, 'PUT', payload)
}

export async function deleteNPC(id: number) {
  await request(`/api/npcs/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function fetchAdminOverview(): Promise<AdminOverviewDTO> {
  const [users, characters, items, maps, npcs] = await Promise.all([
    fetchUsers(),
    fetchCharacters(),
    fetchItems(),
    fetchMaps(),
    fetchNPCs(),
  ])

  const typedUsers = users as Array<{ status?: string }>
  const typedCharacters = characters as Array<{ level?: number }>
  const typedItems = items as Array<{ category?: string }>
  const typedMaps = maps as Array<unknown>
  const typedNPCs = npcs as Array<{ is_active?: boolean; npc_type?: string }>

  return {
    totalUsers: typedUsers.length,
    bannedUsers: typedUsers.filter((user) => user.status === 'banned').length,
    totalCharacters: typedCharacters.length,
    highLevelCharacters: typedCharacters.filter((character) => (character.level ?? 0) >= 10).length,
    totalItems: typedItems.length,
    potionItems: typedItems.filter((item) => item.category === 'potion').length,
    totalMaps: typedMaps.length,
    totalNPCs: typedNPCs.length,
    activeNPCs: typedNPCs.filter((npc) => npc.is_active).length,
    shopNPCs: typedNPCs.filter((npc) => npc.npc_type === 'shop').length,
  }
}
