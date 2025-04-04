import Phaser from 'phaser'

export class MyScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private player!: Phaser.Physics.Arcade.Sprite

  constructor() {
    super('my-scene')
  }

  preload() {
    // -- 타일맵 & 타일셋
    this.load.tilemapTiledJSON('worldmap', 'worldmap.json')
    this.load.image('worldmap_tileset', 'tmw_grass_spacing.png')

    // -- 캐릭터 스프라이트
    this.load.image('char_stand1', 'char1_stand1.png')
    this.load.image('char_stand2', 'char1_stand2.png')
    this.load.image('char_walk1', 'char1_walk1.png')
    this.load.image('char_walk2', 'char1_walk2.png')
  }

  create() {
    // map이 null 반환되지 않을 것을 확신 -> !
    const map = this.make.tilemap({ key: 'worldmap' })
    // tileset이 null 반환되지 않을 것을 확신 -> !
    const tileset = map.addTilesetImage('worldmap_tileset', 'worldmap_tileset', 128, 128, 1, 1)!
    // layer가 null 반환되지 않을 것을 확신 -> !
    const layer = map.createLayer('Tile Layer 1', tileset, 0, 0)!

    layer.setCollisionByProperty({ collides: true })

    // -- 캐릭터 생성
    // (6, 12) 타일 좌표 = (6*128, 12*128) 픽셀 좌표
    this.player = this.physics.add.sprite(6 * 128, 12 * 128, 'char_stand1')

    // -- 애니메이션
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

    // -- 충돌
    this.physics.add.collider(this.player, layer)

    // -- 키보드
    // this.input.keyboard가 null이 아닐 것이라고 확신 -> !
    this.cursors = this.input.keyboard!.createCursorKeys()

    // -- 카메라
    this.cameras.main.startFollow(this.player, true)
  }

  update() {
    const speed = 200
    let vx = 0
    let vy = 0

    if (this.cursors.left?.isDown) {
      vx = -speed
    } else if (this.cursors.right?.isDown) {
      vx = speed
    }

    if (this.cursors.up?.isDown) {
      vy = -speed
    } else if (this.cursors.down?.isDown) {
      vy = speed
    }

    this.player.setVelocity(vx, vy)

    if (vx !== 0 || vy !== 0) {
      this.player.play('walk', true)
    } else {
      this.player.play('stand', true)
    }
  }
}
