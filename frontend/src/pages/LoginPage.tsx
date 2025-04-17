// src/pages/LoginPage.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Paper, TextField, Button, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export default function LoginPage() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]         = useState('')
  const [openSignUp, setOpen] = useState(false)

  const doLogin = async () => {
    setErr('')
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!res.ok) {
        const e = await res.json()
        setErr(e.error || 'Login failed'); return
      }
      // 성공 → 토큰·플래그 저장(프로토타입이라 토큰 대신 flag)
      localStorage.setItem('arkacia_token', 'yes')
      const { user } = await res.json()
      localStorage.setItem('userId', user.id)
      nav('/characters', { replace: true })
    } catch {
      setErr('Network error')
    }
  }

  /* ------------------- 회원가입 ------------------- */
  const [reg, setReg] = useState({ id:'', pw:'', pw2:'', email:'' })
  const [regErr, setRegErr] = useState('')
  const doRegister = async () => {
    setRegErr('')
    const { id, pw, pw2, email } = reg
    if (!id || !pw || !pw2) { setRegErr('All fields required'); return }
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          username:id, password:pw, password_confirm:pw2, email
        })
      })
      if (!res.ok) { const e=await res.json(); setRegErr(e.error); return }
      alert('Registration success! Please login.')
      setOpen(false)
    } catch { setRegErr('Network error') }
  }

  /* ------------------- 렌더링 ------------------- */
  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        backgroundImage: 'url(/assets/login.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}
    >
      {/* 배경 음악 */}
      <audio src="/assets/veins_of_arkacia.mp3" autoPlay loop />

      {/* 게임 타이틀 */}
      <Typography
        variant="h2"
        sx={{
          position: 'absolute', top: 40, left: 50,
          color: 'white', textShadow: '2px 2px 4px #000'
        }}
      >
        Arkacia
      </Typography>

      {/* 로그인 박스 (오른쪽) */}
      <Paper
        sx={{
          position: 'absolute', right: 80, top: '50%', transform: 'translateY(-50%)',
          width: 320, p:3, bgcolor:'rgba(255,255,255,0.9)'
        }}
      >
        <Typography variant="h5" gutterBottom>Login</Typography>
        <TextField
          label="Username" fullWidth margin="normal"
          value={username} onChange={e=>setUsername(e.target.value)}
        />
        <TextField
          label="Password" type="password" fullWidth margin="normal"
          value={password} onChange={e=>setPassword(e.target.value)}
        />
        {err && <Typography color="error">{err}</Typography>}

        <Button variant="contained" fullWidth sx={{mt:1}} onClick={doLogin}>
          Login
        </Button>
        <Button fullWidth sx={{mt:1}} onClick={()=>setOpen(true)}>
          Sign Up
        </Button>
      </Paper>

      {/* ---------- 회원 가입 다이얼로그 ---------- */}
      <Dialog open={openSignUp} onClose={()=>setOpen(false)}>
        <DialogTitle>Sign Up</DialogTitle>
        <DialogContent>
          <TextField
            label="Username (4‑12 a‑z0‑9)" fullWidth margin="dense"
            value={reg.id} onChange={e=>setReg({...reg,id:e.target.value})}
          />
          <TextField
            label="Password (8‑16)" type="password" fullWidth margin="dense"
            value={reg.pw} onChange={e=>setReg({...reg,pw:e.target.value})}
          />
          <TextField
            label="Confirm Password" type="password" fullWidth margin="dense"
            value={reg.pw2} onChange={e=>setReg({...reg,pw2:e.target.value})}
          />
          <TextField
            label="Email (optional)" type="email" fullWidth margin="dense"
            value={reg.email} onChange={e=>setReg({...reg,email:e.target.value})}
          />
          {regErr && <Typography color="error">{regErr}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={doRegister}>Sign Up</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
