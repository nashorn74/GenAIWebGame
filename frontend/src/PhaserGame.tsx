// src/PhaserGame.tsx
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  Fragment,
} from 'react'
import { useNavigate } from 'react-router-dom'
import Phaser from 'phaser'

import { MyScene } from './MyScene'
import MenuPopover  from './ui/MenuPopover'
import NpcDialog    from './ui/NpcDialog'

import {
  getSelectedCharId,
  fetchCharacter,
  CharacterDTO,
} from './utils/character'
import { NpcDTO } from './utils/npc'

/* ────── MUI (이 화면 전용으로만 Theme 주입) ────── */
import {
  CssBaseline,
  createTheme,
  ThemeProvider,
} from '@mui/material'

export default function PhaserGame() {
  /* ------------------------------------------------------------------ */
  /*            Phaser 인스턴스 & React 상태                            */
  /* ------------------------------------------------------------------ */
  const wrapRef   = useRef<HTMLDivElement>(null)
  const gameRef   = useRef<Phaser.Game>()
  const navigate  = useNavigate()

  const [bgmOn  , setBgmOn  ] = useState(true)
  const [mapKey,  setMapKey ] = useState('')
  const [coords , setCoords ] = useState({ x: 0, y: 0 })
  const [char   , setChar   ] = useState<CharacterDTO>()
  const [talkNpc, setTalkNpc] = useState<NpcDTO|null>(null)

  /* ────── MUI theme (PhaserGame 전용) ────── */
  const theme = useMemo(() => createTheme({
    palette: { mode: 'dark' },   // 화면이 게임이라 dark 로
  }), [])

  /* ────── Phaser 인스턴스 생성 ────── */
  useEffect(() => {
    if (!wrapRef.current) return

    const cfg: Phaser.Types.Core.GameConfig = {
      type   : Phaser.AUTO,
      parent : wrapRef.current,
      scene  : [MyScene],
      physics: { default: 'arcade', arcade: { debug: false } },
      audio  : { disableWebAudio: false },
      pixelArt: true,
      render: { antialias: false },
      scale : {
        mode       : Phaser.Scale.RESIZE,
        autoCenter : Phaser.Scale.CENTER_BOTH,
      },
    }
    gameRef.current = new Phaser.Game(cfg)

    return () => gameRef.current?.destroy(true)
  }, [])

  /* ────── 캐릭터 정보 불러오기 ────── */
  useEffect(() => {
    const cid = getSelectedCharId()
    if (!cid) return
    fetchCharacter(cid).then(setChar).catch(console.error)
  }, [])

  /* ────── Scene ↔ React 브리지 ────── */
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('my-scene') as
      | MyScene
      | undefined
    if (!scene) return

    const onMapKey = (mapKey: string) => setMapKey(mapKey)
    const onCoords = (p: { x: number; y: number }) => setCoords(p)
    const onBgm    = (on: boolean) => setBgmOn(on)
    const onNpc    = (n: NpcDTO)   => setTalkNpc(n)

    scene.events.on('mapKey',   onMapKey)
    scene.events.on('coords',   onCoords)
    scene.events.on('bgmState', onBgm)
    scene.events.on('openNpcDialog', onNpc)

    return () => {
      scene.events.off('mapKey',   onMapKey)
      scene.events.off('coords',   onCoords)
      scene.events.off('bgmState', onBgm)
      scene.events.off('openNpcDialog', onNpc)
    }
  }, [gameRef.current])

  /* ────── 로그아웃 ────── */
  const logout = () => {
    localStorage.clear()
    navigate('/', { replace: true })
    window.location.reload()
  }

  /* ------------------------------------------------------------------ */
  /*            렌더링                                                  */
  /* ------------------------------------------------------------------ */
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Phaser 캔버스 wrapper ― margin/padding 0, 화면 100% */}
      <div
        ref={wrapRef}
        style={{
          position : 'fixed',
          inset    : 0,
          margin   : 0,
          padding  : 0,
          overflow : 'hidden',
        }}
      >
        {/* ─── 상단 HUD ─── */}
        <header
          style={{
            position : 'absolute', top: 0, left: 0, right: 0,
            height   : 56,
            display  : 'flex', alignItems: 'center',
            padding  : '0 12px',
            background: 'rgba(0,0,0,.4)',
            color    : '#fff',
            zIndex   : 20,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24 }}>Arkacia</h1>

          <div style={{ marginLeft: 24, fontSize: 14 }}>
            {char
              ? <>
                  Lv.{char.level} {char.job}&nbsp;
                  HP:{char.hp}/{char.max_hp}&nbsp;
                  MP:{char.mp}/{char.max_mp}
                </>
              : 'loading…'}
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 13 }}>
            {mapKey} ({coords.x},{coords.y})
          </div>
        </header>

        {/* ─── 하단 오른쪽 버튼 영역 ─── */}
        <div
          style={{
            position: 'absolute',
            right   : 12,
            bottom  : 12,
            zIndex  : 20,
            display : 'flex',
            gap     : 12,
          }}
        >
          {/* 인벤토리(미구현) */}
          <button
            disabled
            style={{ width: 42, height: 42, border: 'none', borderRadius: 4 }}
          >
            🎒
          </button>

          <MenuPopover
            bgmOn={bgmOn}
            onToggleBgm={() => gameRef.current?.events.emit('toggleBgm')}
            onLogout={logout}
          />
        </div>

        {/* ─── NPC 대화창 ─── */}
        <NpcDialog
          npc={talkNpc}
          onClose={() => {
            setTalkNpc(null)
            /* ── Scene 쿨다운 알림 ── */
            gameRef.current?.events.emit('npcDialogClosed')
          }}
          onOpenShop={n => console.log('TODO - open shop UI for', n.name)}
        />
      </div>
    </ThemeProvider>
  )
}
