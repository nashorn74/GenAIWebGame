import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'
import { fetchAdminSession } from './api'
import { setAdminAuthenticated } from './auth'

type PrivateRouteProps = {
  children: JSX.Element
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking')

  useEffect(() => {
    let active = true

    fetchAdminSession()
      .then((session) => {
        if (!active) {
          return
        }
        if (session.authenticated) {
          setAdminAuthenticated(true)
          setState('allowed')
          return
        }
        setAdminAuthenticated(false)
        setState('denied')
      })
      .catch(() => {
        if (!active) {
          return
        }
        setAdminAuthenticated(false)
        setState('error')
      })

    return () => {
      active = false
    }
  }, [])

  if (state === 'checking') {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: 280 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">Checking admin session…</Typography>
      </Stack>
    )
  }

  if (state === 'error') {
    return (
      <Box sx={{ maxWidth: 420, mx: 'auto', mt: 6 }}>
        <Alert severity="error">
          Failed to verify the admin session. Please sign in again.
        </Alert>
      </Box>
    )
  }

  if (state !== 'allowed') {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
