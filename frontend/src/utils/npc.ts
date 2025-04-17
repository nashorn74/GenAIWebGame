export interface NpcDTO {
    id: number
    name: string
    job: string
    race: string
    dialog: string
    npc_type: 'normal' | 'shop'
    x: number
    y: number
  }
  
  const BASE = import.meta.env.VITE_API_BASE_URL || ''
  
  export async function fetchNpcs(mapKey: string): Promise<NpcDTO[]> {
    const r = await fetch(`${BASE}/api/npcs?map_key=${mapKey}`)
    if (!r.ok) throw new Error('npc fetch error')
    return r.json()
  }
  