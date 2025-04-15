//src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PhaserGame from './PhaserGame'
import AdminLayout from './admin/AdminLayout'
import AdminLogin from './admin/pages/AdminLogin'
import AdminUsers from './admin/pages/AdminUsers'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기존 게임 화면 */}
        <Route path="/" element={<PhaserGame />} />

        {/* /admin 영역 */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* 예: /admin/login /admin/register 등은 "로그인 전" 페이지이므로 별도 구조도 가능 */}
          <Route path="login" element={<AdminLogin />} />

          {/* 관리자 페이지 목록 - 로그인 후 접근 가능 */}
          {/* 실제로는 권한체크(PrivateRoute)도 필요 */}
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
