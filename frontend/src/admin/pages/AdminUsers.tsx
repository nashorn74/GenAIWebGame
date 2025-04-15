// src/admin/pages/AdminUsers.tsx
import React, { useEffect, useState } from 'react'
import { Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Typography } from '@mui/material'

export default function AdminUsers() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
  }, [])

  return (
    <div>
      <Typography variant="h5" gutterBottom>User Management</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>id</TableCell>
              <TableCell>username</TableCell>
              <TableCell>email</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
