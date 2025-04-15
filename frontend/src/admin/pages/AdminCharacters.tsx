// src/admin/pages/AdminCharacters.tsx
import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, TableContainer, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface CharacterData {
  id: number
  name: string
  user_id: number
  job: string
  level: number
  exp: number
  hp: number
  max_hp: number
  mp: number
  max_mp: number
  map_key: string
  x: number
  y: number
  str: number
  dex: number
  intl: number
  gold: number
  items?: any[]
  status_effects: string
  created_at?: string
}

export default function AdminCharacters() {
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChar, setSelectedChar] = useState<CharacterData | null>(null)
  const [charDetail, setCharDetail] = useState<CharacterData | null>(null)
  const [openDetail, setOpenDetail] = useState(false)
  const [detailError, setDetailError] = useState('')

  // 초기 로드: 전체 캐릭터 목록 불러오기
  useEffect(() => {
    fetch(`${BASE_URL}/api/characters`)
      .then(res => res.json())
      .then(data => {
        setCharacters(data)
      })
      .catch(err => {
        console.error('Error fetching characters:', err)
      })
  }, [])

  // 간단한 클라이언트 검색(필터) - 캐릭터 이름
  const filteredChars = characters.filter(ch => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return ch.name.toLowerCase().includes(term)
  })

  // 캐릭터 상세 보기
  const handleView = async (char: CharacterData) => {
    setSelectedChar(char)
    setCharDetail(null)
    setDetailError('')
    try {
      const res = await fetch(`${BASE_URL}/api/characters/${char.id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setDetailError('Character detail not found.')
        } else {
          setDetailError('Failed to load character detail.')
        }
        setOpenDetail(true)
        return
      }
      const detail = await res.json()
      setCharDetail(detail)
    } catch (err) {
      console.error(err)
      setDetailError('Network error while fetching character detail.')
    }
    setOpenDetail(true)
  }

  const handleCloseDetail = () => {
    setOpenDetail(false)
    setSelectedChar(null)
    setCharDetail(null)
    setDetailError('')
  }

  // 캐릭터에 경험치를 추가해서 레벨업 가능
  // 예: PATCH /api/characters/:id/gain_exp { amount: 150 }
  const handleGainExp = async (char: CharacterData, amount: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/characters/${char.id}/gain_exp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })
      if (res.ok) {
        const updated = await res.json()
        alert(updated.message)
        // 목록도 업데이트
        setCharacters(prev => prev.map(c => c.id === char.id ? updated.character : c))
        // 상세 열려있다면 갱신
        if (charDetail && charDetail.id === char.id) {
          setCharDetail(updated.character)
        }
      } else {
        const errData = await res.json()
        alert(errData.error || 'Failed to gain exp')
      }
    } catch (err) {
      alert('Network error while gaining exp.')
    }
  }

  // 캐릭터 삭제
  const handleDelete = async (char: CharacterData) => {
    if (!window.confirm(`Really delete character "${char.name}" ?`)) return
    try {
      const res = await fetch(`${BASE_URL}/api/characters/${char.id}`, { method: 'DELETE' })
      if (res.ok) {
        alert('Character deleted')
        setCharacters(prev => prev.filter(c => c.id !== char.id))
        // 만약 상세 모달 열려있다면 닫기
        if (charDetail?.id === char.id) {
          handleCloseDetail()
        }
      } else {
        alert('Failed to delete character')
      }
    } catch (err) {
      alert('Network error while deleting character.')
    }
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Character Management
      </Typography>

      {/* 검색/필터 영역 */}
      <TextField
        label="Search (character name)"
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
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Job</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>UserID</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredChars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No characters found.
                </TableCell>
              </TableRow>
            ) : (
              filteredChars.map(ch => (
                <TableRow key={ch.id}>
                  <TableCell>{ch.id}</TableCell>
                  <TableCell>
                    <Button variant="text" onClick={() => handleView(ch)}>
                      {ch.name}
                    </Button>
                  </TableCell>
                  <TableCell>{ch.job}</TableCell>
                  <TableCell>{ch.level}</TableCell>
                  <TableCell>{ch.user_id}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => handleGainExp(ch, 150)}
                      style={{ marginRight: 8 }}
                    >
                      +150 EXP
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(ch)}
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
          Character Detail - {selectedChar?.name}
        </DialogTitle>
        <DialogContent>
          {detailError ? (
            <Typography color="error">{detailError}</Typography>
          ) : charDetail ? (
            <div>
              <Typography>ID: {charDetail.id}</Typography>
              <Typography>Name: {charDetail.name}</Typography>
              <Typography>Job: {charDetail.job}</Typography>
              <Typography>Level: {charDetail.level}</Typography>
              <Typography>Exp: {charDetail.exp}</Typography>
              <Typography>HP: {charDetail.hp}/{charDetail.max_hp}</Typography>
              <Typography>MP: {charDetail.mp}/{charDetail.max_mp}</Typography>
              <Typography>Gold: {charDetail.gold}</Typography>
              <Typography>Map: {charDetail.map_key} (x:{charDetail.x}, y:{charDetail.y})</Typography>
              <Typography>STR: {charDetail.str}, DEX: {charDetail.dex}, INT: {charDetail.intl}</Typography>
              <Typography>StatusEffects: {charDetail.status_effects || 'None'}</Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>Items</Typography>
              {charDetail.items && charDetail.items.length > 0 ? (
                charDetail.items.map((it: any) => (
                  <div key={it.id} style={{ marginBottom: '8px' }}>
                    <strong>{it.item?.name}</strong> x {it.quantity}
                  </div>
                ))
              ) : (
                <Typography>No items in inventory.</Typography>
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
