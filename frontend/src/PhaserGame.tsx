// src/PhaserGame.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Phaser from 'phaser'
import { MyScene } from './MyScene'
import MenuPopover from './ui/MenuPopover'

import {
  getSelectedCharId,
  fetchCharacter,
  CharacterDTO,
} from './utils/character'

export default function PhaserGame() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game>()
  const navigate = useNavigate()

  /* ────────────────────────────────────
     HUD state
  ──────────────────────────────────── */
  const [bgmOn, setBgmOn] = useState(true)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [character, setCharacter] = useState<CharacterDTO>()

  /* ────────── Phaser 인스턴스 ────────── */
  useEffect(() => {
    if (!wrapRef.current) return

    const cfg: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: wrapRef.current,
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [MyScene],
      audio: { disableWebAudio: false },

      /* ★ margin 없이 100% 꽉 채우기 */
      scale: {
        mode: Phaser.Scale.RESIZE,            // 브라우저 크기에 자동 대응
        autoCenter: Phaser.Scale.CENTER_BOTH, // 필요하면 중앙 정렬
      },
      pixelArt : true,               // Nearest‑neighbour 필터
      render   : { antialias: false }// 캔버스 자체 안티앨리어스 OFF
    }

    gameRef.current = new Phaser.Game(cfg)

    return () => {
      gameRef.current?.destroy(true)
    }
  }, [])

  /* ────────── 캐릭터 정보 ────────── */
  useEffect(() => {
    const cid = getSelectedCharId()
    if (!cid) return
    fetchCharacter(cid).then(setCharacter).catch(console.error)
  }, [])

  /* ────────── Scene → React 브리지 ────────── */
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('my-scene') as
      | MyScene
      | undefined
    if (!scene) return
    const onCoords = (p: { x: number; y: number }) => setCoords(p)
    const onBgm = (on: boolean) => setBgmOn(on)

    scene.events.on('coords', onCoords)
    scene.events.on('bgmState', onBgm)
    return () => {
      scene.events.off('coords', onCoords)
      scene.events.off('bgmState', onBgm)
    }
  }, [gameRef.current])

  /* ────────── 로그아웃 ────────── */
  const logout = () => {
    localStorage.clear()
    navigate('/', { replace: true })
    window.location.reload()
  }

  return (
    <div
      ref={wrapRef}
      /* ★ body margin 영향을 받지 않도록 fixed & margin 0 */
      style={{
        position: 'fixed',
        inset: 0,           // top:0 right:0 bottom:0 left:0
        margin: 0,
        padding: 0,
        overflow: 'hidden', // 스크롤바 차단
      }}
    >
      {/* ───────── 상단 HUD ───────── */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          background: 'rgba(0,0,0,.4)',
          color: '#fff',
          zIndex: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Arkacia</h1>

        <div style={{ marginLeft: 24, fontSize: 14 }}>
          {character ? (
            <>
              Lv.{character.level} {character.job}&nbsp;
              HP:{character.hp}/{character.max_hp}&nbsp;
              MP:{character.mp}/{character.max_mp}
            </>
          ) : (
            'loading…'
          )}
        </div>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ marginLeft: 8, fontSize: 13 }}>
            ({coords.x},{coords.y})
          </span>
        </div>
      </header>

      {/* ───────── 하단 오른쪽 버튼 ───────── */}
      <div
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          zIndex: 20,
          display: 'flex',
          gap: 12,
        }}
      >
        <button
          disabled // 인벤토리 – 미구현
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
    </div>
  )
}
