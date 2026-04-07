// src/admin/pages/AdminLogin.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAdminAuthenticated } from '../auth'
import { adminLogin } from '../api'
import {
  Box, TextField, Button, Typography, Paper
} from '@mui/material'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')  // 에러 메시지 상태

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')  // 초기화

    try {
      await adminLogin(username, password)
      // 성공(200)
      setAdminAuthenticated(true) // localStorage 저장
      navigate('/admin/users')    // 이동
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Network error or server not responding')
    }
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

          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Login
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
