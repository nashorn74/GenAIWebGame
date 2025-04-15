// src/admin/pages/AdminUsers.tsx
import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, TableContainer, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'

// 환경변수에서 API base URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface UserData {
  id: number
  username: string
  email: string
  status?: string
  created_at?: string
  bio?: string
}

interface CharacterData {
  id: number
  name: string
  level: number
  job: string
  // ... etc.
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null) // 상세정보 (캐릭터목록 등)
  const [openDetail, setOpenDetail] = useState(false)
  const [detailError, setDetailError] = useState<string>('')

  // 초기 로드: 전체 유저 목록 불러오기
  useEffect(() => {
    fetch(`${BASE_URL}/api/users`)
      .then(res => res.json())
      .then(data => {
        setUsers(data)
      })
      .catch(err => {
        console.error('Error fetching users:', err)
      })
  }, [])

  // 간단한 클라이언트 검색(필터)
  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      u.username.toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    )
  })

  // 유저 상세보기 (모달 열기)
  const handleView = async (user: UserData) => {
    setSelectedUser(user)
    setUserDetails(null)
    setDetailError('')

    try {
      const res = await fetch(`${BASE_URL}/api/users/${user.id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setDetailError('User detail not found.')
        } else {
          setDetailError('Failed to load user detail.')
        }
        setOpenDetail(true)
        return
      }
      const detail = await res.json()
      setUserDetails(detail)
    } catch (err) {
      console.error(err)
      setDetailError('Network error while fetching user detail.')
    }
    setOpenDetail(true)
  }

  const handleCloseDetail = () => {
    setOpenDetail(false)
    setSelectedUser(null)
    setUserDetails(null)
    setDetailError('')
  }

  // 유저 정지(Ban) -> POST /api/users/:id/ban
  const handleBan = async (user: UserData) => {
    if (!window.confirm(`Really ban user "${user.username}" ?`)) return
    try {
      const res = await fetch(`${BASE_URL}/api/users/${user.id}/ban`, {
        method: 'POST',
      })
      if (res.ok) {
        const result = await res.json()
        alert(result.message)
        // 로컬 state 갱신
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'banned' } : u))
      } else {
        const errData = await res.json()
        alert(errData.error || 'Failed to ban user')
      }
    } catch (err) {
      alert('Network error while banning user.')
    }
  }

  // 유저 삭제(탈퇴)
  const handleDelete = async (user: UserData) => {
    if (!window.confirm(`Really delete user "${user.username}" ?`)) return
    try {
      const res = await fetch(`${BASE_URL}/api/users/${user.id}`, { method: 'DELETE' })
      if (res.ok) {
        alert('User deleted')
        // 목록에서 제거
        setUsers(prev => prev.filter(u => u.id !== user.id))
      } else {
        alert('Failed to delete user')
      }
    } catch (err) {
      alert('Network error while deleting user.')
    }
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        User Management
      </Typography>

      {/* 검색/필터 영역 */}
      <TextField
        label="Search (username/email)"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '10px' }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>id</TableCell>
              <TableCell>username</TableCell>
              <TableCell>email</TableCell>
              <TableCell>status</TableCell>
              <TableCell>created_at</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>
                    {/* 이름 눌러도 상세보기 가능 */}
                    <Button
                      variant="text"
                      onClick={() => handleView(u)}
                    >
                      {u.username}
                    </Button>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.status}</TableCell>
                  <TableCell>{u.created_at}</TableCell>
                  <TableCell>
                    {u.status !== 'banned' && (
                      <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => handleBan(u)}
                        style={{ marginRight: 8 }}
                      >
                        Ban
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(u)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 상세보기 모달 */}
      <Dialog open={openDetail} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        <DialogTitle>
          User Detail - {selectedUser?.username}
        </DialogTitle>
        <DialogContent>
          {detailError ? (
            <Typography color="error">{detailError}</Typography>
          ) : userDetails ? (
            <div>
              <Typography>ID: {userDetails.id}</Typography>
              <Typography>Email: {userDetails.email}</Typography>
              <Typography>Bio: {userDetails.bio}</Typography>
              <Typography>Status: {userDetails.status}</Typography>
              <Typography>Created: {userDetails.created_at}</Typography>

              {/* 캐릭터 목록 */}
              <Typography variant="h6" sx={{ mt: 2 }}>Characters</Typography>
              {userDetails.characters && userDetails.characters.length > 0 ? (
                userDetails.characters.map((ch: any) => (
                  <div key={ch.id} style={{ marginBottom: '8px' }}>
                    <strong>{ch.name}</strong> (Lv.{ch.level}, {ch.job})
                    <div>Gold: {ch.gold}</div>
                    <div>HP: {ch.hp}/{ch.max_hp}, MP: {ch.mp}/{ch.max_mp}</div>
                    {/* 필요시 인벤토리, 아이템 목록 등도 표시 가능 */}
                  </div>
                ))
              ) : (
                <Typography>No characters found.</Typography>
              )}
            </div>
          ) : (
            <Typography>Loading...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}