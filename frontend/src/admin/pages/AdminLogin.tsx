import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { adminLogin } from '../api'
import { setAdminAuthenticated } from '../auth'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Network error or server not responding'
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await adminLogin(username, password)
      setAdminAuthenticated(true)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        background: 'linear-gradient(135deg, #020617 0%, #1d4ed8 52%, #dbeafe 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 960, borderRadius: 5, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' } }}>
          <Box sx={{ bgcolor: '#0f172a', color: '#f8fafc', p: { xs: 4, md: 6 } }}>
            <Typography variant="overline" sx={{ color: '#93c5fd', letterSpacing: 1.8 }}>
              Arkacia Administration
            </Typography>
            <Typography variant="h3" sx={{ mt: 2, fontWeight: 800, lineHeight: 1.1 }}>
              Secure access for world management
            </Typography>
            <Typography sx={{ mt: 2.5, color: 'rgba(248,250,252,0.78)', maxWidth: 420 }}>
              Use the admin console to review live accounts, inspect progression, and update game
              data without touching the player-facing frontend.
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 4 }}>
              <Typography>1. Validate your admin session.</Typography>
              <Typography>2. Review moderation and balance metrics.</Typography>
              <Typography>3. Apply targeted changes across users, maps, NPCs, and items.</Typography>
            </Stack>
          </Box>

          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Admin Login
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Sign in with the configured administrator credentials.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4 }}>
              <TextField
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                fullWidth
                margin="normal"
                autoComplete="username"
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
                margin="normal"
                autoComplete="current-password"
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, py: 1.4 }} disabled={submitting}>
                {submitting ? 'Signing in…' : 'Login'}
              </Button>
            </Box>
          </CardContent>
        </Box>
      </Card>
    </Box>
  )
}
