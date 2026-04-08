// src/utils/items.ts
export interface ItemDTO {
    id: number;  name: string;  category: string;
    description: string;  buy_price: number; sell_price: number;
    effect_value?: number;  attack_power?: number;  defense_power?: number;
  }
  
  export interface CharItemDTO {
    id: number; item_id: number; quantity: number; item: ItemDTO;
  }
  
  const BASE = import.meta.env.VITE_API_BASE_URL || '';
  
  /* ───── 상점용: 구입 가능한 아이템( buy_price>0 )만 가져오기 ───── */
  export async function fetchShopItems(): Promise<ItemDTO[]> {
    const r = await fetch(`${BASE}/api/items`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`fetchShopItems failed: ${r.status}`);
    const data: ItemDTO[] = await r.json();
    return data.filter(i => i.buy_price > 0);
  }

  /* ───── 캐릭터 인벤토리 ───── */
  export async function fetchInventory(charId: number): Promise<CharItemDTO[]> {
    const r = await fetch(`${BASE}/api/characters/${charId}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`fetchInventory failed: ${r.status}`);
    const c = await r.json();
    const raw = c.items as CharItemDTO[];

    // DB 레이스 컨디션으로 동일 item_id에 여러 행이 존재할 수 있음 → 통합
    const merged = new Map<number, CharItemDTO>();
    for (const ci of raw) {
      const existing = merged.get(ci.item_id);
      if (existing) {
        existing.quantity += ci.quantity;
        console.warn(`[inv] 중복 item_id=${ci.item_id} 통합: qty=${existing.quantity}`);
      } else {
        merged.set(ci.item_id, { ...ci });
      }
    }
    const result = [...merged.values()];
    console.log('[inv] fetchInventory:', result.map(i =>
      `${i.item.name} x${i.quantity}`).join(', '));
    return result;
  }
  
  /* ───── 상점 거래 ───── */
  export async function buyItem(npcId: number, charId: number, itemId: number, qty=1) {
    return fetch(`${BASE}/api/shops/${npcId}/buy`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({character_id: charId, item_id: itemId, quantity: qty})
    }).then(r=>r.json());
  }
  
  export async function sellItem(npcId: number, charId: number, itemId: number, qty=1){
    return fetch(`${BASE}/api/shops/${npcId}/sell`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({character_id: charId, item_id: itemId, quantity: qty})
    }).then(r=>r.json());
  }

  /* ───── 소비 아이템 사용 (물약 등) ───── */
  export async function useItem(charId: number, itemId: number, qty=1) {
    return fetch(`${BASE}/api/items/use`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({character_id: charId, item_id: itemId, quantity: qty})
    }).then(r=>r.json());
  }
  