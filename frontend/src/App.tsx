// src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

const isLoggedIn = () => !!sessionStorage.getItem('arkacia_token')
// "로그인된 userId & charId"를 sessionStorage에 간단히 넣어두는 헬퍼
export const getUserId = () => sessionStorage.getItem('userId')
export const getCharId = () => sessionStorage.getItem('charId')

/**
 * useLocation()을 호출하여 URL 변경 시 re-render를 보장한다.
 * 이것이 없으면 isLoggedIn()이 App의 최초 렌더 시점에만 평가되어,
 * 로그인 후 nav('/characters')를 해도 이전 평가 결과(false)가 사용됨.
 */
function AppRoutes() {
  useLocation()   // URL 변경 구독 -> re-render -> isLoggedIn() 재평가

  return (
    <Routes>
      {/* 플레이어용 로그인 */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* 게임 화면 - 로그인 필요 */}
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
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
