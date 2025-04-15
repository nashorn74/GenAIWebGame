//src/admin/pages/AdminUsers.tsx
import React, { useEffect, useState } from 'react'

export default function AdminUsers() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    // fetch /api/users GET
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
  }, [])

  return (
    <div>
      <h2>User Management</h2>
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>username</th>
            <th>email</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
