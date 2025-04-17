// src/utils/map.ts
export interface MapTeleport{
    from:{x:number,y:number}|{y:number,xRange:[number,number]}
    to_map:string
    to_position:[number,number]
  }
  export interface MapDTO{
    key:string
    display_name:string
    tile_width:number
    tile_height:number
    start_position:[number,number]     // ★
    teleports:MapTeleport[]
  }
  const BASE = import.meta.env.VITE_API_BASE_URL || ''
  export async function fetchMapData(key:string):Promise<MapDTO>{
    const r = await fetch(`${BASE}/api/maps/${key}`)
    if(!r.ok) throw new Error('map fetch err')
    const data = await r.json()
    return {
      ...data,
      start_position: JSON.parse(data.map_data).start_position ?? [0,0],
      teleports:      JSON.parse(data.map_data).teleports      ?? []
    }
  }