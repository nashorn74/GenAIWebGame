// src/ui/InventoryDialog.tsx
import {
    Dialog, DialogTitle, DialogContent,
    Grid, Avatar, Typography, Stack, Button, Alert
  } from '@mui/material'
  import { useEffect, useState } from 'react'
  import { CharItemDTO, fetchInventory, useItem } from '../utils/items'

  interface Props{
    open: boolean
    charId: number
    onClose(): void
    onAfterUse?(): void     // 아이템 사용 후 캐릭터 새로고침 콜백
  }

  export default function InventoryDialog({open,charId,onClose,onAfterUse}:Props){
    const [items,setItems]=useState<CharItemDTO[]>([])
    const [sel ,setSel ]=useState<CharItemDTO>()
    const [msg, setMsg] = useState<{text:string; severity:'success'|'error'}>()

    useEffect(()=>{
      if(open) {
        fetchInventory(charId).then(setItems)
        setSel(undefined)
        setMsg(undefined)
      } else {
        setItems([])
        setSel(undefined)
        setMsg(undefined)
      }
    },[open,charId])

    /* 소비 아이템 사용 */
    const handleUse = async () => {
      if (!sel) return
      try {
        const r = await useItem(charId, sel.item_id)
        if (r.error) {
          setMsg({text: r.error, severity: 'error'})
          return
        }
        setMsg({text: r.message, severity: 'success'})
        // 인벤토리 새로고침
        const updated = await fetchInventory(charId)
        setItems(updated)
        // 방금 사용한 아이템이 아직 남아있으면 선택 유지, 없으면 해제
        const stillExists = updated.find(ci => ci.item_id === sel.item_id)
        setSel(stillExists ?? undefined)
        // 캐릭터 HP 등 새로고침
        onAfterUse?.()
      } catch {
        setMsg({text: '네트워크 오류', severity: 'error'})
      }
    }

    const isPotion = sel?.item.category === 'potion'

    return(
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>인벤토리</DialogTitle>
        <DialogContent dividers>
          {items.length===0 &&
            <Typography sx={{mb:2}}>
              보유한 아이템이 없습니다.
            </Typography>}

          <Grid container spacing={1}>
            {items.map(ci=>(
              <Grid item key={ci.id}>
                <Stack alignItems="center" spacing={0.5}>
                  <Avatar
                    src={`/assets/items/item${ci.item_id.toString().padStart(3,'0')}.png`}
                    sx={{
                      width:48, height:48, cursor:'pointer',
                      border: sel?.item_id === ci.item_id ? '2px solid #90caf9' : 'none',
                    }}
                    onClick={()=>{ setSel(ci); setMsg(undefined) }}
                  />
                  <Typography variant="caption">x{ci.quantity}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>

          {sel &&
            <Stack sx={{mt:2}} spacing={1}>
              <Typography variant="subtitle1">{sel.item.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {sel.item.description}
              </Typography>

              {isPotion && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={handleUse}
                >
                  사용 (HP 회복)
                </Button>
              )}

              {!isPotion && (
                <Typography variant="caption" color="text.secondary">
                  장착 기능은 준비 중입니다.
                </Typography>
              )}

              {msg && (
                <Alert severity={msg.severity} sx={{mt:1}}>
                  {msg.text}
                </Alert>
              )}
            </Stack>}
        </DialogContent>
      </Dialog>
    )
  }
