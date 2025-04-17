// src/ui/ShopDialog.tsx
import {
    Dialog, DialogTitle, Tabs, Tab, Box, Typography,
    List, ListItemButton, ListItemAvatar, Avatar, ListItemText,
    TextField, Button, Stack, Divider, Alert
  } from '@mui/material'
  import { ItemDTO, CharItemDTO, fetchShopItems, fetchInventory,
           buyItem, sellItem } from '../utils/items'
  import { useEffect, useState } from 'react'
  import { NpcDTO } from '../utils/npc'
  
  interface Props {
    npc: NpcDTO | null        // 상점 NPC (shop 타입만)
    charId: number            // 현재 플레이어 캐릭터 id
    charGold: number        // ★ 보유 골드 전달
    onClose(): void
    onAfterTrade(): void      // 성공 후 캐릭터 정보 새로고침용
  }
  
  export default function ShopDialog({ npc, charId, charGold,
    onClose, onAfterTrade }: Props) {
  
    const [tab , setTab ] = useState<'buy'|'sell'>('buy')
    const [items , setItems ] = useState<ItemDTO[]>([])
    const [inv   , setInv   ] = useState<CharItemDTO[]>([])
    const [selId , setSelId ] = useState<number>()
    const [qty   , setQty   ] = useState(1)
    const [msg   , setMsg   ] = useState<string>()  // 에러·알람
  
    /* 처음 열릴 때 목록 로드 */
    useEffect(()=>{ if(!npc) return
        fetchShopItems().then(setItems)
        fetchInventory(charId).then(setInv)
        setTab('buy'); setSelId(undefined); setMsg(undefined)
    },[npc])
  
    if(!npc) return null
    const open = !!npc
  
    /* 현재 탭에서 보여줄 리스트 */
    const list = tab==='buy'
        ? items
        : inv.filter(ci=>ci.item.sell_price>0)     // 판매 가능만
  
    const selItem = tab==='buy'
        ? items.find(i=>i.id===selId)
        : inv.find(ci=>ci.item_id===selId)?.item
  
    /* 거래 버튼 핸들 */
    const handleTrade = async ()=>{
      if(!selItem) return
      try{
        if(tab==='buy'){
          const r = await buyItem(npc.id, charId, selItem.id, qty)
          if(r.error) { setMsg(r.error); return }
        }else{
          const r = await sellItem(npc.id, charId, selItem.id, qty)
          if(r.error) { setMsg(r.error); return }
        }
        setMsg(undefined)
        await Promise.all([
          fetchInventory(charId).then(setInv),
          fetchShopItems().then(setItems)
        ])
        onAfterTrade()              // 캐릭터 골드 새로고침
      }catch(e){ setMsg('network error') }
    }
  
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {npc.name} – 상점&nbsp;&nbsp;
          <Typography component="span" variant="body2" color="gold">
            (보유 골드 {charGold.toLocaleString()} G)
          </Typography>
        </DialogTitle>
  
        <Tabs value={tab} onChange={(_,v)=>{setTab(v); setSelId(undefined)}} centered>
          <Tab label="구입"  value="buy" />
          <Tab label="판매" value="sell"/>
        </Tabs>
  
        <Box sx={{display:'flex',height:420}}>
          {/* ─ 리스트 ─ */}
          <List sx={{flex:1, overflow:'auto'}}>
            {list.length===0 &&
              <Typography sx={{p:2}} color="text.secondary">
                {tab==='buy'
                  ? '구매 가능한 아이템이 없습니다.'
                  : '판매할 아이템이 없습니다.'}
              </Typography>}

            {list.map((i)=>(
              <ListItemButton key={i.id} selected={i.id===selId}
                onClick={()=>setSelId(i.id)}>
                <ListItemAvatar>
                  <Avatar
                    src={`/assets/items/item${i.id.toString().padStart(3,'0')}.png`}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={i.name}
                  secondary={
                    tab==='buy'
                      ? `${i.buy_price} G`
                      : `x${inv.find(ci=>ci.item_id===i.id)?.quantity}  /  ${i.sell_price} G`
                  }
                />
              </ListItemButton>
            ))}
          </List>
  
          <Divider orientation="vertical" flexItem/>
  
          {/* ─ 상세 & 액션 ─ */}
          <Stack sx={{width:260,p:2}} spacing={2}>
            {selItem?(
              <>
                <Typography variant="h6">{selItem.name}</Typography>
                <Typography variant="body2">{selItem.description}</Typography>
                <TextField
                  type="number" size="small" label="수량"
                  value={qty}
                  onChange={e=>setQty(Math.max(1,Number(e.target.value)))}
                  inputProps={{min:1}}
                />
                {msg && <Alert severity="error">{msg}</Alert>}
                <Button variant="contained" onClick={handleTrade}>
                  {tab==='buy'
                    ? `${selItem.buy_price*qty} G 구매`
                    : `${selItem.sell_price*qty} G 판매`}
                </Button>
              </>
            ):<Typography>아이템을 선택하세요</Typography>}
          </Stack>
        </Box>
  
        <Box sx={{textAlign:'right',p:2}}>
          <Button onClick={onClose}>닫기</Button>
        </Box>
      </Dialog>
    )
  }
  