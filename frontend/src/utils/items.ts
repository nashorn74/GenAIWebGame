// src/utils/items.ts
export interface ItemDTO {
    id: number;  name: string;  category: string;
    description: string;  buy_price: number; sell_price: number;
  }
  
  export interface CharItemDTO {
    id: number; item_id: number; quantity: number; item: ItemDTO;
  }
  
  const BASE = import.meta.env.VITE_API_BASE_URL || '';
  
  /* ───── 상점용: 구입 가능한 아이템( buy_price>0 )만 가져오기 ───── */
  export async function fetchShopItems(): Promise<ItemDTO[]> {
    const r = await fetch(`${BASE}/api/items`);
    const data: ItemDTO[] = await r.json();
    return data.filter(i => i.buy_price > 0);
  }
  
  /* ───── 캐릭터 인벤토리 ───── */
  export async function fetchInventory(charId: number): Promise<CharItemDTO[]> {
    const r = await fetch(`${BASE}/api/characters/${charId}`);
    const c = await r.json();
    return c.items as CharItemDTO[];
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
  