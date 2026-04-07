// src/admin/api.ts — Admin API utility functions
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// ── Auth ──

export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/admin_login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Login failed')
  }
  return res.json()
}

// ── Users ──

export async function fetchUsers() {
  const res = await fetch(`${BASE_URL}/api/users`)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function fetchUserDetail(id: number) {
  const userRes = await fetch(`${BASE_URL}/api/users/${id}`)
  if (!userRes.ok) {
    throw new Error(userRes.status === 404 ? 'User detail not found.' : 'Failed to load user detail.')
  }
  const user = await userRes.json()

  const charsRes = await fetch(`${BASE_URL}/api/characters?user_id=${id}`)
  if (!charsRes.ok) throw new Error('Failed to load characters.')
  const characters = await charsRes.json()

  return { user, characters }
}

export async function banUser(id: number) {
  const res = await fetch(`${BASE_URL}/api/users/${id}/ban`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to ban user')
  }
  return res.json()
}

export async function deleteUser(id: number) {
  const res = await fetch(`${BASE_URL}/api/users/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete user')
}

// ── Characters ──

export async function fetchCharacters() {
  const res = await fetch(`${BASE_URL}/api/characters`)
  if (!res.ok) throw new Error('Failed to fetch characters')
  return res.json()
}

export async function fetchCharacterDetail(id: number) {
  const res = await fetch(`${BASE_URL}/api/characters/${id}`)
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'Character detail not found.' : 'Failed to load character detail.')
  }
  return res.json()
}

export async function gainExp(id: number, amount: number) {
  const res = await fetch(`${BASE_URL}/api/characters/${id}/gain_exp`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to gain exp')
  }
  return res.json()
}

export async function deleteCharacter(id: number) {
  const res = await fetch(`${BASE_URL}/api/characters/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete character')
}

// ── Items ──

export async function fetchItems(category?: string) {
  let url = `${BASE_URL}/api/items`
  if (category) url += `?category=${encodeURIComponent(category)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch items')
  return res.json()
}

export async function createItem(payload: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to create item')
  }
  return res.json()
}

export async function updateItem(id: number, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to update item')
  }
  return res.json()
}

export async function deleteItem(id: number) {
  const res = await fetch(`${BASE_URL}/api/items/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to delete item')
  }
}

// ── Maps ──

export async function fetchMaps() {
  const res = await fetch(`${BASE_URL}/api/maps`)
  if (!res.ok) throw new Error('Failed to fetch maps')
  return res.json()
}

export async function createMap(payload: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/maps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to create map')
  }
  return res.json()
}

export async function updateMap(key: string, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/maps/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to update map')
  }
  return res.json()
}

export async function deleteMap(key: string) {
  const res = await fetch(`${BASE_URL}/api/maps/${key}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to delete map')
  }
}

// ── NPCs ──

export async function fetchNPCs() {
  const res = await fetch(`${BASE_URL}/api/npcs`)
  if (!res.ok) throw new Error('Failed to fetch NPCs')
  return res.json()
}

export async function createNPC(payload: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/npcs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to create NPC')
  }
  return res.json()
}

export async function updateNPC(id: number, payload: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/npcs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to update NPC')
  }
  return res.json()
}

export async function deleteNPC(id: number) {
  const res = await fetch(`${BASE_URL}/api/npcs/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to delete NPC')
  }
}
