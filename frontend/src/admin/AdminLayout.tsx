//src/admin/AdminLayout.tsx
import React from 'react'
import { Outlet, Link } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex' }}>
      {/* 좌측 사이드바 */}
      <nav style={{ width: '200px', background: '#eee' }}>
        <h2>Admin Menu</h2>
        <ul>
          <li><Link to="/admin/users">User Management</Link></li>
          <li><Link to="/admin/characters">Character Management</Link></li>
          <li><Link to="/admin/maps">Map Management</Link></li>
          <li><Link to="/admin/npcs">NPC Management</Link></li>
          <li><Link to="/admin/items">Item Management</Link></li>
        </ul>
      </nav>

      {/* 우측 메인 영역 */}
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  )
}
