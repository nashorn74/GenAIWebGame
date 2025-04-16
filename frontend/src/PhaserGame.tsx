// src/PhaserGame.tsx
import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Phaser from 'phaser'
import { MyScene } from './MyScene'

const PhaserGame: React.FC = () => {
  const phaserRef = useRef<HTMLDivElement>(null)
  const navigate  = useNavigate()

  /* ① Phaser 인스턴스 생성 */
  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: phaserRef.current || undefined,
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [MyScene],
    }

    const game = new Phaser.Game(config)
    return () => game.destroy(true)
  }, [])

  /* ② 로그아웃 처리 */
  const handleLogout = () => {
    // 토큰 · 사용자 정보 초기화 (저장한 key 에 맞춰 수정하세요)
    localStorage.removeItem('userToken')
    localStorage.removeItem('userInfo')
    // 로그인 페이지로 이동
    navigate('/login', { replace: true })
  }

  /* ③ 캔버스 + 오버레이 버튼 */
  return (
    <div style={{ position: 'relative', width: 800, height: 600 }}>
      {/* Phaser가 붙는 곳 */}
      <div ref={phaserRef} style={{ width: '100%', height: '100%' }} />

      {/* 오른쪽 상단 로그아웃 버튼 */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          padding: '6px 12px',
          borderRadius: 4,
          background: '#d32f2f',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  )
}

export default PhaserGame
