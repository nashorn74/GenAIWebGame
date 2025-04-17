// src/ui/InventoryDialog.tsx
import {
    Dialog, DialogTitle, DialogContent,
    Grid, Avatar, Typography, Stack, Button
  } from '@mui/material'
  import { useEffect, useState } from 'react'
  import { CharItemDTO, fetchInventory } from '../utils/items'
  
  interface Props{
    open: boolean
    charId: number
    onClose(): void
  }
  
  export default function InventoryDialog({open,charId,onClose}:Props){
    const [items,setItems]=useState<CharItemDTO[]>([])
    const [sel ,setSel ]=useState<CharItemDTO>()
  
    useEffect(()=>{
      if(open) fetchInventory(charId).then(setItems)
      else { setItems([]); setSel(undefined)}
    },[open,charId])
  
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
                    sx={{width:48,height:48, cursor:'pointer'}}
                    onClick={()=>setSel(ci)}
                  />
                  <Typography variant="caption">x{ci.quantity}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
  
          {sel &&
            <Stack sx={{mt:2}} spacing={1}>
              <Typography variant="subtitle1">{sel.item.name}</Typography>
              <Typography variant="body2">{sel.item.description}</Typography>
              {/* 실제 사용/장착 로직은 추후 기능 추가 시 연동 */}
              <Button size="small" disabled>사용/장착(미구현)</Button>
            </Stack>}
        </DialogContent>
      </Dialog>
    )
  }
  