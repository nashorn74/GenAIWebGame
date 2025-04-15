// src/admin/PrivateRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { isAdminAuthenticated } from './auth'

type PrivateRouteProps = {
  children: JSX.Element
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const auth = isAdminAuthenticated()

  if (!auth) {
    // 로그인 안 된 상태 → /admin/login 으로 리다이렉트
    return <Navigate to="/admin/login" replace />
  }
  // 로그인됨 → 해당 children을 렌더
  return children
}
