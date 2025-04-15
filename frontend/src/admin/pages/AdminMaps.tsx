// src/admin/pages/AdminMaps.tsx
import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, TableContainer, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface MapData {
  key: string
  display_name: string
  json_file: string
  tileset_file: string
  tile_width: number
  tile_height: number
  width: number
  height: number
  map_data: string
}

export default function AdminMaps() {
  const [maps, setMaps] = useState<MapData[]>([])
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // New or Edit form states
  const [formData, setFormData] = useState<Partial<MapData>>({})

  useEffect(() => {
    loadMaps()
  }, [])

  const loadMaps = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/maps`)
      const data = await res.json()
      setMaps(data)
    } catch (err) {
      console.error('Failed to load maps', err)
    }
  }

  const handleOpenCreate = () => {
    setIsEditing(false)
    setSelectedMap(null)
    setFormData({
      key: '',
      display_name: '',
      json_file: '',
      tileset_file: '',
      tile_width: 128,
      tile_height: 128,
      width: 40,
      height: 30,
      map_data: `{
        "start_position": [6,12],
        "teleports": []
      }`
    })
    setOpenDialog(true)
  }

  const handleOpenEdit = (m: MapData) => {
    setIsEditing(true)
    setSelectedMap(m)
    setFormData({ ...m })  // copy existing map data
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedMap(null)
    setFormData({})
  }

  const handleChange = (field: keyof MapData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!formData.key || !formData.key.trim()) {
      alert('Map key is required')
      return
    }

    const payload: any = {
      key: formData.key,
      display_name: formData.display_name,
      json_file: formData.json_file,
      tileset_file: formData.tileset_file,
      tile_width: Number(formData.tile_width),
      tile_height: Number(formData.tile_height),
      width: Number(formData.width),
      height: Number(formData.height),
      map_data: formData.map_data || '{}'
    }

    try {
      if (isEditing && selectedMap) {
        // PUT /maps/:key
        const res = await fetch(`${BASE_URL}/api/maps/${selectedMap.key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          alert('Map updated')
          // reload
          loadMaps()
          handleCloseDialog()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to update map')
        }
      } else {
        // POST /maps
        const res = await fetch(`${BASE_URL}/api/maps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          alert('Map created')
          loadMaps()
          handleCloseDialog()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to create map')
        }
      }
    } catch (err) {
      alert('Network error')
    }
  }

  const handleDelete = async (m: MapData) => {
    if (!window.confirm(`Really delete map "${m.key}"?`)) return
    try {
      const res = await fetch(`${BASE_URL}/api/maps/${m.key}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        alert('Map deleted')
        loadMaps()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete map')
      }
    } catch (err) {
      alert('Network error')
    }
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Map Management
      </Typography>

      <Button variant="contained" onClick={handleOpenCreate} style={{ marginBottom: 10 }}>
        + Create New Map
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Display Name</TableCell>
              <TableCell>JSON File</TableCell>
              <TableCell>Tileset File</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {maps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No maps found.
                </TableCell>
              </TableRow>
            ) : (
              maps.map(m => (
                <TableRow key={m.key}>
                  <TableCell>{m.key}</TableCell>
                  <TableCell>{m.display_name}</TableCell>
                  <TableCell>{m.json_file}</TableCell>
                  <TableCell>{m.tileset_file}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => handleOpenEdit(m)}
                      style={{ marginRight: 8 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(m)}
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

      {/* Dialog for create/edit */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Map' : 'Create Map'}
        </DialogTitle>
        <DialogContent>
          {/* key, display_name, json_file, tileset_file, tile_width, tile_height, width, height */}
          <TextField
            label="Map Key"
            value={formData.key || ''}
            onChange={e => handleChange('key', e.target.value)}
            fullWidth
            margin="normal"
            disabled={isEditing}  // key는 수정 불가
          />
          <TextField
            label="Display Name"
            value={formData.display_name || ''}
            onChange={e => handleChange('display_name', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="JSON File"
            value={formData.json_file || ''}
            onChange={e => handleChange('json_file', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Tileset File"
            value={formData.tileset_file || ''}
            onChange={e => handleChange('tileset_file', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Tile Width"
            type="number"
            value={formData.tile_width ?? 128}
            onChange={e => handleChange('tile_width', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Tile Height"
            type="number"
            value={formData.tile_height ?? 128}
            onChange={e => handleChange('tile_height', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Map Width (in tiles)"
            type="number"
            value={formData.width ?? 40}
            onChange={e => handleChange('width', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Map Height (in tiles)"
            type="number"
            value={formData.height ?? 30}
            onChange={e => handleChange('height', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Map Data (JSON)"
            value={formData.map_data ?? '{}'}
            onChange={e => handleChange('map_data', e.target.value)}
            fullWidth
            multiline
            minRows={4}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
