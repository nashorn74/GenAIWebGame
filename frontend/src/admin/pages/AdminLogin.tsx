// src/admin/pages/AdminLogin.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAdminAuthenticated } from '../auth'
import {
  Box, TextField, Button, Typography, Paper
} from '@mui/material'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: call real /api/admin/login
    // if success from server, set auth
    setAdminAuthenticated(true)  // localStorage 저장
    navigate('/admin/users')     // 이동
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper sx={{ p: 3, width: 300 }}>
        <Typography variant="h5" gutterBottom>Admin Login</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Login
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
