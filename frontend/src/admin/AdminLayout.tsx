// src/admin/AdminLayout.tsx

import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Box, Drawer, List, ListItemButton, ListItemText, Toolbar, AppBar, Typography } from '@mui/material'
import { setAdminAuthenticated } from './auth'

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  // 일반 메뉴
  const menuItems = [
    { label: 'User Management', path: '/admin/users' },
    { label: 'Character Management', path: '/admin/characters' },
    { label: 'Map Management', path: '/admin/maps' },
    { label: 'NPC Management', path: '/admin/npcs' },
    { label: 'Item Management', path: '/admin/items' },
  ]

  const handleLogout = () => {
    // 인증 해제
    setAdminAuthenticated(false)
    // 로그인 페이지로 이동
    navigate('/admin/login')
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* 상단 AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Admin Panel
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 왼쪽 Drawer (사이드바) */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Toolbar /> {/* to push content below AppBar */}

        <List>
          {/* 일반 메뉴 항목 */}
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
              <ListItemButton selected={location.pathname === item.path}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </Link>
          ))}

          {/* 구분선 등 스타일 필요 시 */}
          {/* <Divider sx={{ my: 1 }} /> */}

          {/* 로그아웃 버튼 */}
          <ListItemButton onClick={handleLogout}>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* 우측 메인 컨테이너 */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* AppBar height spacer */}
        <Outlet />
      </Box>
    </Box>
  )
}
