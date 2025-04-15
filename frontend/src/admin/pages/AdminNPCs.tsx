// src/admin/pages/AdminNPCs.tsx

import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, TableContainer, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, FormControl, InputLabel, Select, MenuItem
} from '@mui/material'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface NPCData {
  id: number
  name: string
  gender: string
  race: string
  job: string
  map_key: string
  x: number
  y: number
  dialog: string
  is_active: boolean
  npc_type: string   // "normal" or "shop"
  created_at?: string
}

export default function AdminNPCs() {
  const [npcs, setNpcs] = useState<NPCData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showShopOnly, setShowShopOnly] = useState(false)

  const [openDialog, setOpenDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedNPC, setSelectedNPC] = useState<NPCData | null>(null)

  const [formData, setFormData] = useState<Partial<NPCData>>({})

  useEffect(() => {
    loadNPCs()
  }, [])

  const loadNPCs = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/npcs`)
      const data = await res.json()
      setNpcs(data)
    } catch (err) {
      console.error('Failed to load NPCs', err)
    }
  }

  // 검색 + 상점 필터
  const filteredNPCs = npcs.filter(n => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!n.name.toLowerCase().includes(term)) {
        return false
      }
    }
    if (showShopOnly && n.npc_type !== 'shop') {
      return false
    }
    return true
  })

  const handleOpenCreate = () => {
    setIsEditing(false)
    setSelectedNPC(null)
    setFormData({
      name: '',
      gender: 'female',
      race: 'Human',
      job: 'Guard',
      map_key: 'worldmap',
      x: 0,
      y: 0,
      dialog: '안녕하세요!',
      is_active: true,
      npc_type: 'normal'
    })
    setOpenDialog(true)
  }

  const handleOpenEdit = (npc: NPCData) => {
    setIsEditing(true)
    setSelectedNPC(npc)
    setFormData({ ...npc }) 
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedNPC(null)
    setFormData({})
  }

  const handleChange = (field: keyof NPCData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      alert('Name is required')
      return
    }

    const payload: any = {
      name: formData.name,
      gender: formData.gender,
      race: formData.race,
      job: formData.job,
      map_key: formData.map_key,
      x: Number(formData.x),
      y: Number(formData.y),
      dialog: formData.dialog,
      is_active: Boolean(formData.is_active),
      npc_type: formData.npc_type
    }

    try {
      if (isEditing && selectedNPC) {
        const res = await fetch(`${BASE_URL}/api/npcs/${selectedNPC.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          alert('NPC updated')
          loadNPCs()
          handleCloseDialog()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to update NPC')
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/npcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          alert('NPC created')
          loadNPCs()
          handleCloseDialog()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to create NPC')
        }
      }
    } catch (err) {
      alert('Network error')
    }
  }

  const handleDelete = async (npc: NPCData) => {
    if (!window.confirm(`Really delete NPC "${npc.name}"?`)) return
    try {
      const res = await fetch(`${BASE_URL}/api/npcs/${npc.id}`, { method: 'DELETE' })
      if (res.ok) {
        alert('NPC deleted')
        loadNPCs()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete NPC')
      }
    } catch (err) {
      alert('Network error')
    }
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        NPC Management
      </Typography>

      <TextField
        label="Search by Name"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={showShopOnly}
            onChange={e => setShowShopOnly(e.target.checked)}
          />
        }
        label="Show Shop NPC Only"
      />

      <Button variant="contained" onClick={handleOpenCreate} style={{ marginLeft: 10, marginBottom: 10 }}>
        + Create NPC
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Map</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredNPCs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No NPCs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredNPCs.map(npc => (
                <TableRow key={npc.id}>
                  <TableCell>{npc.id}</TableCell>
                  <TableCell>{npc.name}</TableCell>
                  <TableCell>{npc.npc_type === 'shop' ? 'Shop' : 'Normal'}</TableCell>
                  <TableCell>{npc.map_key}</TableCell>
                  <TableCell>({npc.x}, {npc.y})</TableCell>
                  <TableCell>{npc.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => handleOpenEdit(npc)}
                      style={{ marginRight: 8 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(npc)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit NPC' : 'Create NPC'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={formData.name || ''}
            onChange={e => handleChange('name', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="NPC Type"
            value={formData.npc_type || 'normal'}
            onChange={e => handleChange('npc_type', e.target.value)}
            fullWidth
            margin="normal"
            // 혹은 Select 컴포넌트로 해도됨
          />
          <TextField
            label="Gender"
            value={formData.gender || 'female'}
            onChange={e => handleChange('gender', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Race"
            value={formData.race || 'Human'}
            onChange={e => handleChange('race', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Job"
            value={formData.job || 'Guard'}
            onChange={e => handleChange('job', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Map Key"
            value={formData.map_key || 'worldmap'}
            onChange={e => handleChange('map_key', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="X"
            type="number"
            value={formData.x ?? 0}
            onChange={e => handleChange('x', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Y"
            type="number"
            value={formData.y ?? 0}
            onChange={e => handleChange('y', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Dialog"
            value={formData.dialog || ''}
            onChange={e => handleChange('dialog', e.target.value)}
            fullWidth
            margin="normal"
            multiline
            minRows={3}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!formData.is_active}
                onChange={e => handleChange('is_active', e.target.checked)}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
