import React, { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { adminLogout } from './api'
import { setAdminAuthenticated } from './auth'

const DRAWER_WIDTH = 280

const menuItems = [
  { label: 'Overview', path: '/admin/dashboard', description: 'Summary and quick actions' },
  { label: 'Users', path: '/admin/users', description: 'Review player accounts' },
  { label: 'Characters', path: '/admin/characters', description: 'Audit progression and inventories' },
  { label: 'Maps', path: '/admin/maps', description: 'Manage world metadata' },
  { label: 'NPCs', path: '/admin/npcs', description: 'Control NPC placement and roles' },
  { label: 'Items', path: '/admin/items', description: 'Tune economy and balance' },
]

function getPageMeta(pathname: string) {
  const page = menuItems.find((item) => pathname.startsWith(item.path))
  return page ?? menuItems[0]
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const currentPage = useMemo(() => getPageMeta(location.pathname), [location.pathname])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await adminLogout()
    } catch {
      // The local auth hint is still cleared so a stale UI cannot remain open.
    } finally {
      setAdminAuthenticated(false)
      setLoggingOut(false)
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f7fb' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Arkacia Admin Console
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentPage.description}
            </Typography>
          </Box>
          <Chip label="Session Active" color="success" variant="outlined" />
          <Button variant="contained" color="inherit" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#101828',
            color: '#f8fafc',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="overline" sx={{ color: '#93c5fd', letterSpacing: 1.6 }}>
            Administration
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
            Control Room
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(248,250,252,0.74)' }}>
            Monitor the live game, investigate reports, and keep economy data consistent.
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
        <List sx={{ px: 1.5, py: 2 }}>
          {menuItems.map((item) => {
            const selected = location.pathname.startsWith(item.path)
            return (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                selected={selected}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  alignItems: 'flex-start',
                  '&.active, &.Mui-selected': {
                    bgcolor: 'rgba(59,130,246,0.18)',
                  },
                }}
              >
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  primaryTypographyProps={{ fontWeight: 600, color: '#f8fafc' }}
                  secondaryTypographyProps={{ color: 'rgba(248,250,252,0.62)' }}
                />
              </ListItemButton>
            )
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Toolbar />
        <Stack spacing={3} sx={{ p: { xs: 2, md: 4 } }}>
          <Box>
            <Typography variant="overline" color="primary">
              Admin Workspace
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {currentPage.label}
            </Typography>
          </Box>
          <Outlet />
        </Stack>
      </Box>
    </Box>
  )
}
