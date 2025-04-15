// src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PhaserGame from './PhaserGame'
import AdminLayout from './admin/AdminLayout'
import AdminLogin from './admin/pages/AdminLogin'
import AdminUsers from './admin/pages/AdminUsers'

// PrivateRoute
import PrivateRoute from './admin/PrivateRoute'
import AdminCharacters from './admin/pages/AdminCharacters'
import AdminMaps from './admin/pages/AdminMaps'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기존 게임 화면 */}
        <Route path="/" element={<PhaserGame />} />

        {/* /admin 영역 */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* 로그인 페이지 (권한 없이 접근 가능) */}
          <Route path="login" element={<AdminLogin />} />

          {/* 권한 필요한 관리자 페이지 */}
          <Route
            path="users"
            element={
              <PrivateRoute>
                <AdminUsers />
              </PrivateRoute>
            }
          />
          <Route
            path="characters"
            element={
              <PrivateRoute>
                <AdminCharacters />
              </PrivateRoute>
            }
          />
          <Route
            path="maps"
            element={
              <PrivateRoute>
                <AdminMaps />
              </PrivateRoute>
            }
          />
          {/* 여기에 npcs, items 등도 추가 가능 */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
