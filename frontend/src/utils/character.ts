// src/utils/character.ts
export interface CharacterDTO{
    id:number; user_id:number; name:string; level:number; job:string;
    hp:number; max_hp:number; mp:number; max_mp:number;
    /* 필요 시 다른 필드도… */
  }
  
  const BASE   = import.meta.env.VITE_API_BASE_URL || ''
  
  /** localStorage 에 저장해 둔 선택 캐릭터 id 가져오기 */
  export function getSelectedCharId(): number | null {
    const v = localStorage.getItem('charId')
    return v ? Number(v) : null
  }
  
  /** 캐릭터 정보를 서버에서 fetch */
  export async function fetchCharacter(charId:number):Promise<CharacterDTO>{
    const res = await fetch(`${BASE}/api/characters/${charId}`)
    if(!res.ok) throw new Error('Failed to fetch character')
    return res.json()
  }
  