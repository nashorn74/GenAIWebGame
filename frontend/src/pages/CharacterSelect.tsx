import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardActionArea, CardContent, Typography,
  Button, Grid, Dialog, CardMedia
} from '@mui/material'
import { getUserId } from '../App'
import CharacterDialog from './CharacterDialog'

interface Char {
  id:number, name:string, job:string, level:number
}

const IMAGE_BY_JOB: Record<string,string> = {
  warrior : '/assets/char001.jpg',
  archer  : '/assets/char001.jpg',   // 아직 하나뿐이니 일단 같은 이미지
  mage    : '/assets/char001.jpg'
}

const MAX_SLOT = 3

export default function CharacterSelect() {
  const userId = getUserId()
  const navigate = useNavigate()

  const [chars, setChars]       = useState<Char[]>([])
  const [sel  , setSel  ]       = useState<Char|null>(null)
  const [open , setOpen ]       = useState(false)   // 캐릭터 생성/수정 dialog
  const [edit , setEdit ]       = useState<Char|null>(null)

  /** 로그인 체크 */
  useEffect(() => { if(!userId) navigate('/login', {replace:true}) }, [])

  /** 캐릭터 목록 불러오기 */
  const reload = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/characters?user_id=${userId}`)
      .then(r=>r.json()).then(setChars)
  }
  useEffect(reload, [userId])

  /** 슬롯 카드 UI */
  const renderSlot = (index:number) => {
    const char = chars[index]
  
    /* ───────────── 1) 비어있는 슬롯 ───────────── */
    if(!char){
      return (
        <Card sx={{height:260}}>
          <CardActionArea onClick={()=>{ setEdit(null); setOpen(true) }}
                          sx={{height:'100%', display:'flex',
                              alignItems:'center', justifyContent:'center'}}>
            <Typography variant="h6">+ New Character</Typography>
          </CardActionArea>
        </Card>
      )
    }
  
    /* ───────────── 2) 캐릭터가 있는 슬롯 ───────────── */
    const img = IMAGE_BY_JOB[char.job] || '/assets/char001.jpg'
  
    return (
      <Card
        sx={{
          height:260,
          border: sel?.id===char.id ? '2px solid #1976d2' : undefined
        }}
      >
        <CardActionArea onClick={()=>setSel(char)} sx={{height:'100%'}}>
          {/* <CardMedia> : 300 x 140px 정도 영역에 이미지 삽입 */}
          <CardMedia
            component="img"
            height="140"
            image={img}
            alt={char.name}
          />
          <CardContent sx={{pt:1}}>
            <Typography variant="subtitle1">{char.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Lv.{char.level} {char.job}
            </Typography>
  
            {/* 편집 / 삭제 작은 버튼 */}
            <Box sx={{mt:1}}>
              <Button size="small" onClick={(e)=>{e.stopPropagation(); setEdit(char); setOpen(true)}}>Edit</Button>
              <Button size="small" color="error"
                onClick={async (e)=>{e.stopPropagation();
                  if(!confirm('Delete this character?')) return
                  await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/characters/${char.id}`,{method:'DELETE'})
                  reload()
                }}>Delete</Button>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    )
  }

  const handleStart = () => {
    if(!sel) return
    localStorage.setItem('charId', String(sel.id))
    navigate('/play')
  }

  return (
    <Box sx={{p:4}}>
      <Typography variant="h4" sx={{mb:2}}>Select Your Character</Typography>

      <Grid container spacing={2} sx={{maxWidth:800}}>
        {Array.from({length:MAX_SLOT}).map((_,i)=>(
          <Grid item xs={12} sm={4} key={i}>{renderSlot(i)}</Grid>
        ))}
      </Grid>

      <Button
        variant="contained"
        disabled={!sel}
        sx={{mt:3}}
        onClick={handleStart}
      >
        Start with Selected
      </Button>

      {/* 캐릭터 생성/수정 다이얼로그 */}
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="md">
        <CharacterDialog
          userId={Number(userId)}
          char={edit}
          onSaved={()=>{ setOpen(false); reload() }}
          onCancel={()=> setOpen(false)}
        />
      </Dialog>
    </Box>
  )
}
