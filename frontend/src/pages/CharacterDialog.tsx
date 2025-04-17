import React, { useState } from 'react'
import {
  Box, Typography, TextField, RadioGroup, FormControlLabel,
  Radio, Button, Divider
} from '@mui/material'

interface Props {
  userId : number
  char   : any | null   // null → 생성, 객체 → 수정
  onSaved():void
  onCancel():void
}

export default function CharacterDialog({userId, char, onSaved, onCancel}:Props){
  const isEdit = !!char
  const [name , setName ] = useState(char?.name  || '')
  const [job  , setJob  ] = useState(char?.job   || 'warrior')
  const [gender,setGender]= useState(char?.gender|| 'female')
  const [hair , setHair ] = useState(char?.hair_color||'brown')
  const [err  , setErr  ] = useState('')

  const handleSave = async () => {
    setErr('')
    const payload = { name, job, gender, hair_color:hair, user_id:userId }
    try{
      const url = import.meta.env.VITE_API_BASE_URL + '/api/characters' + (isEdit?`/${char.id}`:'')
      const res = await fetch(url,{
        method: isEdit?'PUT':'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      })
      if(!res.ok){ const d=await res.json(); setErr(d.error||'Failed'); return }
      onSaved()
    }catch(e){ setErr('network error')}
  }

  // UI : 왼쪽 이미지 / 오른쪽 폼
  return (
    <Box sx={{display:'flex',width:600}}>
      <Box sx={{width:300, height:450, background:`url('/assets/char001.jpg') center/cover`}} />

      <Box sx={{flex:1, p:3}}>
        <Typography variant="h5" gutterBottom>
          {isEdit? 'Edit Character':'New Character'}
        </Typography>

        <TextField
          label="Name" fullWidth size="small" sx={{mb:2}}
          value={name} onChange={e=>setName(e.target.value)}
        />

        <Divider sx={{my:1}} />

        <Typography>Job</Typography>
        <RadioGroup row value={job} onChange={e=>setJob(e.target.value)}>
          <FormControlLabel value="warrior" control={<Radio/>} label="Warrior" />
          <FormControlLabel value="archer"  control={<Radio disabled/>} label="Archer" />
          <FormControlLabel value="mage"    control={<Radio disabled/>} label="Mage" />
        </RadioGroup>

        <Typography>Gender</Typography>
        <RadioGroup row value={gender} onChange={e=>setGender(e.target.value)}>
          <FormControlLabel value="male"   control={<Radio disabled/>} label="Male" />
          <FormControlLabel value="female" control={<Radio/>}         label="Female" />
        </RadioGroup>

        <Typography>Hair Color</Typography>
        <RadioGroup row value={hair} onChange={e=>setHair(e.target.value)}>
          <FormControlLabel value="brown"  control={<Radio/>}         label="Brown" />
          <FormControlLabel value="black"  control={<Radio disabled/>} label="Black" />
          <FormControlLabel value="blonde" control={<Radio disabled/>} label="Blonde" />
        </RadioGroup>

        {err && <Typography color="error">{err}</Typography>}

        <Box sx={{mt:2, display:'flex', gap:1}}>
          <Button variant="contained" onClick={handleSave}>Save</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </Box>
      </Box>
    </Box>
  )
}
