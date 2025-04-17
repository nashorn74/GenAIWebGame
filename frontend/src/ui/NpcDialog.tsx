import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Stack
  } from '@mui/material'
  import { NpcDTO } from '../utils/npc'
  
  interface Props {
    npc: NpcDTO | null
    onClose(): void
    onOpenShop(npc: NpcDTO): void
  }
  
  export default function NpcDialog({ npc, onClose, onOpenShop }: Props) {
    const open = !!npc
    if (!npc) return null
  
    const portrait = `/assets/portraits/npc${npc.id
      .toString()
      .padStart(3, '0')}.jpg`
  
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{npc.name}</DialogTitle>
  
        <DialogContent dividers>
          <Stack direction="row" spacing={2}>
            <img
              src={portrait}
              alt={npc.name}
              style={{ width: 140, height: 210, objectFit: 'cover' }}
            />
  
            <Stack spacing={1} flex={1}>
              <Typography variant="subtitle2">
                직업: {npc.job} / 종족: {npc.race}
              </Typography>
              <Typography>{npc.dialog}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
  
        <DialogActions>
          {npc.npc_type === 'shop' && (
            <Button onClick={() => onOpenShop(npc)}>상점으로 이동</Button>
          )}
          <Button onClick={onClose} variant="contained">
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  