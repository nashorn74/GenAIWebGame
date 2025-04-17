// src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PhaserGame from './PhaserGame'
import LoginPage from './pages/LoginPage'
import CharacterSelect  from './pages/CharacterSelect'
import AdminLayout from './admin/AdminLayout'
import AdminLogin from './admin/pages/AdminLogin'
import AdminUsers from './admin/pages/AdminUsers'

// PrivateRoute
import PrivateRoute from './admin/PrivateRoute'
import AdminCharacters from './admin/pages/AdminCharacters'
import AdminMaps from './admin/pages/AdminMaps'
import AdminNPCs from './admin/pages/AdminNPCs'
import AdminItems from './admin/pages/AdminItems'

const isLoggedIn = () => !!localStorage.getItem('arkacia_token')
// “로그인된 userId & charId”를 localStorage에 간단히 넣어두는 헬퍼
export const getUserId   = () => localStorage.getItem('userId')
export const getCharId   = () => localStorage.getItem('charId')

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 플레이어용 로그인 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* 게임 화면 – 로그인 필요 */}
        <Route
          path="/play"
          element={
            isLoggedIn() ? <PhaserGame /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/characters"
          element={
            isLoggedIn() ? <CharacterSelect /> : <Navigate to="/login" replace />
          }
        />

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
          <Route
            path="npcs"
            element={
              <PrivateRoute>
                <AdminNPCs />
              </PrivateRoute>
            }
          />
          <Route
            path="items"
            element={
              <PrivateRoute>
                <AdminItems />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
