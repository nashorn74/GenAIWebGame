import Phaser from 'phaser'

type MapKey = 'worldmap' | 'city2' | 'dungeon1'

export class MyScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private player!: Phaser.Physics.Arcade.Sprite

  private currentMap!: MapKey
  private tilemap?: Phaser.Tilemaps.Tilemap
  private layer?: Phaser.Tilemaps.TilemapLayer
  // ★ 기존 collider를 저장
  private playerCollider?: Phaser.Physics.Arcade.Collider

  constructor() {
    super('my-scene')
  }

  preload() {
    // worldmap
    this.load.tilemapTiledJSON('worldmap', 'worldmap.json')
    this.load.image('worldmap_tileset', 'tmw_grass_spacing.png')

    // city2
    this.load.tilemapTiledJSON('city2', 'city2.json')
    this.load.image('city_tileset', 'tmw_city_spacing.png')

    // dungeon1
    this.load.tilemapTiledJSON('dungeon1', 'dungeon1.json')
    this.load.image('dungeon_tileset', 'tmw_dungeon_spacing.png')

    // 캐릭터
    this.load.image('char_stand1', 'char1_stand1.png')
    this.load.image('char_stand2', 'char1_stand2.png')
    this.load.image('char_walk1', 'char1_walk1.png')
    this.load.image('char_walk2', 'char1_walk2.png')
  }

  create() {
    this.player = this.physics.add.sprite(0, 0, 'char_stand1')
    this.player.setCollideWorldBounds(true)

    // 애니메이션
    this.anims.create({
      key: 'stand',
      frames: [{ key: 'char_stand1' }, { key: 'char_stand2' }],
      frameRate: 2,
      repeat: -1
    })
    this.anims.create({
      key: 'walk',
      frames: [{ key: 'char_walk1' }, { key: 'char_walk2' }],
      frameRate: 4,
      repeat: -1
    })

    // 초기 맵
    this.loadMap('worldmap', 6, 12)

    this.cursors = this.input.keyboard!.createCursorKeys()
  }

  private loadMap(mapKey: MapKey, tileX: number, tileY: number) {
    // ★ 1) 이전 collider 제거
    if (this.playerCollider) {
      this.playerCollider.destroy()
      this.playerCollider = undefined
    }

    // ★ 이전 layer 제거
    if (this.layer) {
      this.layer.destroy()
      this.layer = undefined
    }

    // tilemap 생성
    const map = this.make.tilemap({ key: mapKey })

    // mapKey 에 따라 Tileset name, 이미지 키 다름
    let tilesetName = ''
    if (mapKey === 'worldmap') {
      tilesetName = 'worldmap_tileset'
    } else if (mapKey === 'city2') {
      tilesetName = 'city_tileset'
    } else if (mapKey === 'dungeon1') {
      tilesetName = 'dungeon_tileset'
    }

    const tileset = map.addTilesetImage(tilesetName, tilesetName, 128, 128, 1, 1)
    if (!tileset) {
      throw new Error(`Tileset not found: ${tilesetName}`)
    }

    const layer = map.createLayer('Tile Layer 1', tileset, 0, 0)
    if (!layer) {
      throw new Error(`Layer "Tile Layer 1" not found`)
    }

    layer.setCollisionByProperty({ collides: true })

    // ★ 2) 새 collider 생성
    this.playerCollider = this.physics.add.collider(this.player, layer)

    // 맵/레이어 참조 저장
    this.tilemap = map
    this.layer = layer
    this.currentMap = mapKey

    // 카메라 & 물리영역
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true)

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.player.setCollideWorldBounds(true)

    // ★ 3) Depth 설정 (레이어가 뒤, 캐릭터가 앞)
    layer.setDepth(0)
    this.player.setDepth(1)

    // ★ 4) 위치 이동
    const px = (tileX + 0.5) * map.tileWidth
    const py = (tileY + 0.5) * map.tileHeight
    this.player.setPosition(px, py)
  }

  update() {
    const speed = 200
    let vx = 0
    let vy = 0

    if (this.cursors.left?.isDown) vx = -speed
    else if (this.cursors.right?.isDown) vx = speed

    if (this.cursors.up?.isDown) vy = -speed
    else if (this.cursors.down?.isDown) vy = speed

    this.player.setVelocity(vx, vy)

    if (vx !== 0 || vy !== 0) {
      this.player.play('walk', true)
    } else {
      this.player.play('stand', true)
    }

    if (!this.tilemap) return

    const tileX = Math.floor(this.player.x / this.tilemap.tileWidth)
    const tileY = Math.floor(this.player.y / this.tilemap.tileHeight)

    // 맵 이동 로직
    if (this.currentMap === 'worldmap') {
      if (tileX === 14 && tileY === 15) {
        this.loadMap('city2', 13, 2)
      } else if (tileX === 12 && tileY === 8) {
        this.loadMap('dungeon1', 10, 2)
      }
    } else if (this.currentMap === 'city2') {
      if ((tileY === 0 && tileX >= 11 && tileX <= 15) ||
          (tileY === 29 && tileX >= 11 && tileX <= 15)) {
        this.loadMap('worldmap', 13, 15)
      }
    } else if (this.currentMap === 'dungeon1') {
      if (tileY === 0 && tileX >= 8 && tileX <= 12) {
        this.loadMap('worldmap', 12, 9)
      }
    }
  }
}
