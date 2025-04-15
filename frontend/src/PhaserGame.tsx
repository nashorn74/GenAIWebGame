import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MyScene } from './MyScene' // 아래에서 구현할 Scene 클래스

const PhaserGame: React.FC = () => {
  const phaserRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: phaserRef.current || undefined,
      // 물리 엔진 활성화
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: [MyScene],
    }

    const game = new Phaser.Game(config)

    return () => {
      game.destroy(true)
    }
  }, [])

  return <div ref={phaserRef} />
}

export default PhaserGame
