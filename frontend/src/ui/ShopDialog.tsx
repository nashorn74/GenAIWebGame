// src/ui/ShopDialog.tsx
import {
  Dialog, DialogTitle, Tabs, Tab, Box, Typography,
  List, ListItemButton, ListItemAvatar, Avatar, ListItemText,
  TextField, Button, Stack, Divider, Alert
} from '@mui/material'
import {
  ItemDTO, CharItemDTO, fetchShopItems, fetchInventory,
  buyItem, sellItem
} from '../utils/items'
import { useEffect, useState } from 'react'
import { NpcDTO } from '../utils/npc'

interface Props {
  npc: NpcDTO | null        // shop NPC (shop 타입만)
  charId: number            // 플레이어 캐릭터 id
  charGold: number          // 보유 골드
  onClose(): void
  onAfterTrade(): void      // 거래 성공 후 캐릭터/인벤토리 새로고침
}

export default function ShopDialog ({
  npc, charId, charGold, onClose, onAfterTrade
}: Props) {

  const [tab , setTab ] = useState<'buy'|'sell'>('buy')
  const [items , setItems ] = useState<ItemDTO[]>([])
  const [inv   , setInv   ] = useState<CharItemDTO[]>([])
  const [selId , setSelId ] = useState<number>()
  const [qty   , setQty   ] = useState(1)
  const [msg   , setMsg   ] = useState<string>()

  /* ───────────────── 목록 로드 ───────────────── */
  useEffect(() => {
    if (!npc) return
    (async () => {
      setItems(await fetchShopItems())
      setInv(await fetchInventory(charId))
      setTab('buy')
      setSelId(undefined)
      setMsg(undefined)
    })()
  }, [npc, charId])

  if (!npc) return null
  const open = !!npc

  /* 현재 탭에서 쓰일 리스트 */
  const list = tab === 'buy'
    ? items
    : inv.filter(ci => ci.item.sell_price > 0)    // 판매 가능 항목

  /* 선택된 아이템 DTO */
  const selItem = tab === 'buy'
    ? items.find(i => i.id === selId)
    : inv.find(ci => ci.item_id === selId)?.item

  /* 거래 실행 */
  const handleTrade = async () => {
    if (!selItem) return
    try {
      if (tab === 'buy') {
        const r = await buyItem(npc.id, charId, selItem.id, qty)
        if (r.error) { setMsg(r.error); return }
      } else {
        const r = await sellItem(npc.id, charId, selItem.id, qty)
        if (r.error) { setMsg(r.error); return }
      }
      setMsg(undefined)
      // 인벤토리 & 상점 목록 재로드
      setInv(await fetchInventory(charId))
      setItems(await fetchShopItems())
      onAfterTrade()
    } catch {
      setMsg('network error')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {npc.name} – 상점&nbsp;&nbsp;
        <Typography component="span" variant="body2" color="gold">
          (보유 골드 {charGold.toLocaleString()} G)
        </Typography>
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); setSelId(undefined) }}
        centered
      >
        <Tab label="구입"  value="buy" />
        <Tab label="판매" value="sell"/>
      </Tabs>

      <Box sx={{ display: 'flex', height: 420 }}>
        {/* ─────────── 리스트 ─────────── */}
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {list.length === 0 &&
            <Typography sx={{ p: 2 }} color="text.secondary">
              {tab === 'buy'
                ? '구매 가능한 아이템이 없습니다.'
                : '판매할 아이템이 없습니다.'}
            </Typography>
          }

          {list.map(i => {
            /* 공통 식별자·썸네일·라벨 계산 */
            const id        = tab === 'buy' ? (i as ItemDTO).id
                                             : (i as CharItemDTO).item_id
            const quantity  = tab === 'buy' ? 1
                                             : (i as CharItemDTO).quantity
            const itemDTO   = tab === 'buy' ? i as ItemDTO
                                             : (i as CharItemDTO).item

            return (
              <ListItemButton
                key={id}
                selected={selId === id}
                onClick={() => setSelId(id)}
              >
                <ListItemAvatar>
                  <Avatar
                    src={`/assets/items/item${id.toString().padStart(3, '0')}.png`}
                  />
                </ListItemAvatar>

                <ListItemText
                  primary={itemDTO.name}
                  secondary={
                    tab === 'buy'
                      ? `${itemDTO.buy_price} G`
                      : `x${quantity}  /  ${itemDTO.sell_price} G`
                  }
                />
              </ListItemButton>
            )
          })}
        </List>

        <Divider orientation="vertical" flexItem />

        {/* ─────────── 상세 & 액션 ─────────── */}
        <Stack sx={{ width: 260, p: 2 }} spacing={2}>
          {selItem ? (
            <>
              <Typography variant="h6">{selItem.name}</Typography>
              <Typography variant="body2">{selItem.description}</Typography>

              <TextField
                type="number"
                size="small"
                label="수량"
                value={qty}
                onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                inputProps={{ min: 1 }}
              />

              {msg && <Alert severity="error">{msg}</Alert>}

              <Button variant="contained" onClick={handleTrade}>
                {tab === 'buy'
                  ? `${selItem.buy_price * qty} G 구매`
                  : `${selItem.sell_price * qty} G 판매`}
              </Button>
            </>
          ) : (
            <Typography>아이템을 선택하세요</Typography>
          )}
        </Stack>
      </Box>

      <Box sx={{ textAlign: 'right', p: 2 }}>
        <Button onClick={onClose}>닫기</Button>
      </Box>
    </Dialog>
  )
}
