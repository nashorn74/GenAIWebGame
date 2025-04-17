import Phaser from 'phaser'
import { MapTeleport, fetchMapData } from './utils/map'

type MapKey = 'worldmap' | 'city2' | 'dungeon1'

export class MyScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private player!: Phaser.Physics.Arcade.Sprite

  private currentMap!: MapKey
  private tilemap?: Phaser.Tilemaps.Tilemap
  private layer?: Phaser.Tilemaps.TilemapLayer
  // ★ 기존 collider를 저장
  private playerCollider?: Phaser.Physics.Arcade.Collider
  private bgm?: Phaser.Sound.BaseSound
  private teleports:MapTeleport[] = []
  private miniCam!: Phaser.Cameras.Scene2D.Camera;   // ← 미니맵 카메라 참조 추가

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

    // BGM – public 폴더 기준 경로(예: /assets/wandering_through_enchantment.mp3)
    this.load.audio('wandering_through_enchantment', 'assets/wandering_through_enchantment.mp3')
  }

  /** 사용자 입력이 있어야만 재생할 수 있을 때를 처리 */
  private playBgmSafe() {
    if (!this.bgm) return

    if (this.sound.locked) {
      // 아직 ‘락’ 상태 → 첫 pointerdown/keydown 을 기다렸다가 재생
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.bgm!.play())
    } else {
      // 이미 재생 가능한 상태
      this.bgm.play()
    }
  }

  async create() {
    /* ① player를 먼저 만든 다음 minimap 카메라 follow -------------------------------- */
    this.player = this.physics.add.sprite(0,0,'char_stand1')
    this.player.setCollideWorldBounds(true)

    this.miniCam = this.cameras.add(
      this.scale.width - 190,   // **this.scale.width** 로 대체
      60,
      180,
      180,
      false,
      'mini'
    );
    this.miniCam.setZoom(0.12).startFollow(this.player);

    /* BGM ---------------------------------------------------------------- */
    this.bgm = this.sound.add('wandering_through_enchantment',
      { loop: true, volume: 0.5 })
    this.playBgmSafe()

    // React → BGM 토글
    this.game.events.on('toggleBgm',()=>{
      if(this.bgm?.isPlaying) this.bgm.pause()
      else                    this.bgm?.resume()
      this.events.emit('bgmState', !this.bgm?.isPaused)
    })

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

    this.cursors = this.input.keyboard!.createCursorKeys()

    /* ③ 맵 데이터를 먼저 받아서 start_position 사용 ------------------------------- */
    const worldInfo = await fetchMapData('worldmap')
    const [sx,sy]  = worldInfo.start_position      // 6,12

    await this.loadMap('worldmap', sx, sy)         // <-- 맵/플레이어 세팅

    this.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: Phaser.Structs.Size) => {
      const { width /*, height */ } = gameSize;      // height 가 필요하면 같이 사용
      this.miniCam.setPosition(width - 190, 60);     // X 좌표만 다시 계산
    });
  }

  /* ───────── 맵 로드 ───────── */
  private async loadMap(mapKey:MapKey, tileX:number,tileY:number){
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

    /* ---- 맵 JSON 정보 읽기 ---------------------------------------------------- */
    const mapInfo  = await fetchMapData(mapKey)
    this.teleports = mapInfo.teleports

    /* minimap 카메라 bounds 갱신 */
    this.miniCam.setBounds(0,0,map.widthInPixels,map.heightInPixels)

    /* 플레이어 위치 설정 -------------------------------------------------------- */
    const px = (tileX+0.5)*map.tileWidth
    const py = (tileY+0.5)*map.tileHeight
    this.player.setPosition(px,py)

    /* 메인 카메라는 loadMap 마지막에 다시 follow (첫 loadMap 도 포함) --------- */
    this.cameras.main.startFollow(this.player,true)

    this.events.emit('coords',{
      x: tileX,
      y: tileY
    })
  }

  update() {
    if (!this.cursors) return   // ← create 가 중단됐을 때 대비

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

    /* 좌표 React 전달 ---------------------------------------------------- */
    const tX=Math.floor(this.player.x/this.tilemap!.tileWidth)
    const tY=Math.floor(this.player.y/this.tilemap!.tileHeight)
    this.events.emit('coords',{x:tX,y:tY})

    /* ★ NEW – 서버 teleports 로 맵 이동 ------------------------------- */
    for(const tp of this.teleports){
      // from: {x, y}  또는  {y, xRange:[a,b]}
      const cond = ('x' in tp.from)
        ? (tp.from.x===tX && tp.from.y===tY)
        : (tY===tp.from.y && tX>=tp.from.xRange[0] && tX<=tp.from.xRange[1])

      if(cond){
        const [nx,ny] = tp.to_position
        this.loadMap(tp.to_map as MapKey, nx, ny)
        break
      }
    }
  }
}
