// src/admin/pages/AdminItems.tsx

import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, TableContainer, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface ItemData {
  id: number
  name: string
  category: string        // "drop", "potion", "weapon", "armor", etc.
  description: string
  buy_price: number
  sell_price: number
  attack_power: number
  defense_power: number
  effect_value: number
  created_at?: string
}

export default function AdminItems() {
  const [items, setItems] = useState<ItemData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('') // ex) "potion","drop"...
  const [openDialog, setOpenDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null)
  const [formData, setFormData] = useState<Partial<ItemData>>({})

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      let url = `${BASE_URL}/api/items`
      if (categoryFilter) {
        url += `?category=${categoryFilter}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setItems(data)
    } catch (err) {
      console.error('Failed to load items', err)
    }
  }

  // 간단한 클라이언트 검색
  const filteredItems = items.filter(it => {
    // 이름에 searchTerm가 포함되는지
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!it.name.toLowerCase().includes(term)) {
        return false
      }
    }
    return true
  })

  const handleFilterChange = (cat: string) => {
    setCategoryFilter(cat)
    // 필터 바뀌면 다시 loadItems() 해서 서버쪽에서 category=cat 쿼리
    setTimeout(() => {
      loadItems()
    }, 0)
  }

  const handleOpenCreate = () => {
    setIsEditing(false)
    setSelectedItem(null)
    setFormData({
      name: '',
      category: 'drop',
      description: '',
      buy_price: 0,
      sell_price: 0,
      attack_power: 0,
      defense_power: 0,
      effect_value: 0
    })
    setOpenDialog(true)
  }

  const handleOpenEdit = (item: ItemData) => {
    setIsEditing(true)
    setSelectedItem(item)
    setFormData({ ...item }) // copy
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedItem(null)
    setFormData({})
  }

  const handleChange = (field: keyof ItemData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    // validation
    if (!formData.name?.trim()) {
      alert('Item name is required')
      return
    }

    const payload = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      buy_price: Number(formData.buy_price),
      sell_price: Number(formData.sell_price),
      attack_power: Number(formData.attack_power),
      defense_power: Number(formData.defense_power),
      effect_value: Number(formData.effect_value)
    }

    try {
      if (isEditing && selectedItem) {
        // PUT
        const res = await fetch(`${BASE_URL}/api/items/${selectedItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          alert('Item updated')
          loadItems()
          handleCloseDialog()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to update item')
        }
      } else {
        // POST
        const res = await fetch(`${BASE_URL}/api/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          alert('Item created')
          loadItems()
          handleCloseDialog()
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to create item')
        }
      }
    } catch (err) {
      alert('Network error')
    }
  }

  const handleDelete = async (item: ItemData) => {
    if (!window.confirm(`Really delete item "${item.name}"?`)) return
    try {
      const res = await fetch(`${BASE_URL}/api/items/${item.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        alert('Item deleted')
        loadItems()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete item')
      }
    } catch (err) {
      alert('Network error')
    }
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Item Management
      </Typography>

      {/* 검색 / 분류 필터 */}
      <TextField
        label="Search by Name"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={{ marginRight: 10 }}
      />
      <FormControl size="small" style={{ width: 200, marginRight: 10 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={categoryFilter}
          label="Category"
          onChange={e => handleFilterChange(e.target.value as string)}
        >
          <MenuItem value="">(All)</MenuItem>
          <MenuItem value="drop">drop</MenuItem>
          <MenuItem value="potion">potion</MenuItem>
          <MenuItem value="weapon">weapon</MenuItem>
          <MenuItem value="armor">armor</MenuItem>
        </Select>
      </FormControl>

      <Button variant="contained" onClick={handleOpenCreate} style={{ marginBottom: 10 }}>
        + Create Item
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>BuyPrice</TableCell>
              <TableCell>SellPrice</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.buy_price}</TableCell>
                  <TableCell>{item.sell_price}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => handleOpenEdit(item)}
                      style={{ marginRight: 8 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(item)}
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
        <DialogTitle>{isEditing ? 'Edit Item' : 'Create Item'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={formData.name || ''}
            onChange={e => handleChange('name', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Category"
            value={formData.category || 'drop'}
            onChange={e => handleChange('category', e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Description"
            value={formData.description || ''}
            onChange={e => handleChange('description', e.target.value)}
            fullWidth
            margin="normal"
            multiline
            minRows={2}
          />
          <TextField
            label="Buy Price"
            type="number"
            value={formData.buy_price ?? 0}
            onChange={e => handleChange('buy_price', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Sell Price"
            type="number"
            value={formData.sell_price ?? 0}
            onChange={e => handleChange('sell_price', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Attack Power"
            type="number"
            value={formData.attack_power ?? 0}
            onChange={e => handleChange('attack_power', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Defense Power"
            type="number"
            value={formData.defense_power ?? 0}
            onChange={e => handleChange('defense_power', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Effect Value"
            type="number"
            value={formData.effect_value ?? 0}
            onChange={e => handleChange('effect_value', parseInt(e.target.value, 10))}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
