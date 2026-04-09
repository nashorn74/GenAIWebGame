import React, { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { AdminOverviewDTO, fetchAdminOverview } from '../api'

const emptyOverview: AdminOverviewDTO = {
  totalUsers: 0,
  bannedUsers: 0,
  totalCharacters: 0,
  highLevelCharacters: 0,
  totalItems: 0,
  potionItems: 0,
  totalMaps: 0,
  totalNPCs: 0,
  activeNPCs: 0,
  shopNPCs: 0,
}

function StatCard({
  title,
  value,
  caption,
}: {
  title: string
  value: string | number
  caption: string
}) {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {caption}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverviewDTO>(emptyOverview)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOverview = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminOverview()
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  const healthSummary = useMemo(() => {
    if (overview.totalUsers === 0) {
      return 'No player accounts are available yet.'
    }
    if (overview.bannedUsers > 0) {
      return `${overview.bannedUsers} account${overview.bannedUsers > 1 ? 's are' : ' is'} currently restricted.`
    }
    return 'No restricted accounts detected.'
  }, [overview.bannedUsers, overview.totalUsers])

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 4,
          color: '#fff',
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          boxShadow: '0 18px 50px rgba(29, 78, 216, 0.28)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="overline" sx={{ opacity: 0.8 }}>
            Operations Overview
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
            Live administration snapshot
          </Typography>
          <Typography sx={{ mt: 1.5, maxWidth: 720, opacity: 0.82 }}>
            Use this dashboard to spot moderation pressure, balance hotspots, and data-management gaps
            before moving into the detailed admin tools.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button component={RouterLink} to="/admin/users" variant="contained" color="inherit">
              Review users
            </Button>
            <Button component={RouterLink} to="/admin/items" variant="outlined" color="inherit">
              Tune economy
            </Button>
            <Button variant="text" color="inherit" onClick={() => void loadOverview()}>
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <StatCard
            title="Users"
            value={overview.totalUsers}
            caption={`${overview.bannedUsers} banned, ${overview.totalUsers - overview.bannedUsers} active`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <StatCard
            title="Characters"
            value={overview.totalCharacters}
            caption={`${overview.highLevelCharacters} characters are level 10 or above`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <StatCard
            title="Economy"
            value={overview.totalItems}
            caption={`${overview.potionItems} consumables currently configured`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <StatCard
            title="World"
            value={overview.totalNPCs}
            caption={`${overview.shopNPCs} shop NPCs across ${overview.totalMaps} maps`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Moderation queue
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {healthSummary}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Active NPC ratio: {overview.totalNPCs === 0 ? '0%' : `${Math.round((overview.activeNPCs / overview.totalNPCs) * 100)}%`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Recommended next steps
              </Typography>
              <Stack spacing={1.2} sx={{ mt: 2 }} color="text.secondary">
                <Typography>1. Review newly banned or suspicious accounts.</Typography>
                <Typography>2. Check high-level character growth for economy inflation.</Typography>
                <Typography>3. Audit map and NPC distribution before live events.</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
