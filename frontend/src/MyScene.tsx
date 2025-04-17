import Phaser from 'phaser'
import { MapTeleport, fetchMapData } from './utils/map'
import { fetchNpcs, NpcDTO } from './utils/npc'

type MapKey = 'worldmap' | 'city2' | 'dungeon1'
const TALK_DIST   = 48   // 대화 시작
const RESET_DIST  = 64   // 다시 대화 가능해지는 거리

export class MyScene extends Phaser.Scene {
  /* ▽▽ 필드 ▽▽ */
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private player!: Phaser.Physics.Arcade.Sprite

  private tilemap?: Phaser.Tilemaps.Tilemap
  private layer?  : Phaser.Tilemaps.TilemapLayer
  private playerCollider?: Phaser.Physics.Arcade.Collider

  private teleports: MapTeleport[] = []
  private miniCam!: Phaser.Cameras.Scene2D.Camera

  private npcGroup!: Phaser.GameObjects.Group
  private npcsMeta: NpcDTO[] = []

  private bgm?: Phaser.Sound.BaseSound
  private interactingNpcId = 0   // 중복 대화 방지
  private closeDialogNpc = false

  /* ▽▽ SETUP ▽▽ */
  constructor() { super('my-scene') }

  preload() {
    /* --- 맵 & 플레이어 --- */
    this.load.tilemapTiledJSON('worldmap', 'worldmap.json')
    this.load.tilemapTiledJSON('city2'   , 'city2.json')
    this.load.tilemapTiledJSON('dungeon1', 'dungeon1.json')

    this.load.image('worldmap_tileset', 'tmw_grass_spacing.png')
    this.load.image('city_tileset'   , 'tmw_city_spacing.png')
    this.load.image('dungeon_tileset', 'tmw_dungeon_spacing.png')

    this.load.image('char_stand1','char1_stand1.png')
    this.load.image('char_stand2','char1_stand2.png')
    this.load.image('char_walk1' ,'char1_walk1.png')
    this.load.image('char_walk2' ,'char1_walk2.png')

    /* --- NPC 스프라이트(stand 2컷) --- */
    for (let i = 1; i <= 10; i++) {
      const id = i.toString()
      this.load.image(`npc${id}_1`, `assets/npc${id}_stand1.png`)
      this.load.image(`npc${id}_2`, `assets/npc${id}_stand2.png`)
    }

    /* --- BGM --- */
    this.load.audio(
      'wandering_bgm',
      'assets/wandering_through_enchantment.mp3'
    )
  }

  /* ▽▽ CREATE ▽▽ */
  async create() {
    /* 플레이어 & 키보드 */
    this.player = this.physics.add.sprite(0, 0, 'char_stand1')
    this.player.setCollideWorldBounds(true)
    this.cursors = this.input.keyboard!.createCursorKeys()

    /* 미니맵 카메라 */
    this.miniCam = this.cameras.add(
      this.scale.width - 190,
      60,
      180,
      180,
      false,
      'mini'
    )
    this.miniCam.setZoom(0.12).startFollow(this.player)

    /* BGM (사용자 상호작용 unlock 고려) */
    this.bgm = this.sound.add('wandering_bgm', { loop: true, volume: 0.5 })
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.bgm!.play())
    } else {
      this.bgm.play()
    }
    this.game.events.on('toggleBgm', () => {
      if (this.bgm?.isPlaying) this.bgm.pause()
      else this.bgm?.resume()
      this.events.emit('bgmState', !this.bgm?.isPaused)
    })
    /* React 가 ‘닫기’ 눌렀을 때 호출됨 */
    this.game.events.on('npcDialogClosed', () => {
      // 음수로 두면 update() 안에서 ‘멀어질 때까지 대화금지’ 상태
      console.log('npcDialogClosed')
      this.closeDialogNpc = true
    })

    /* 스탠드/워크 애니메이션 */
    this.anims.create({
      key: 'stand',
      frames: [{ key: 'char_stand1' }, { key: 'char_stand2' }],
      frameRate: 2,
      repeat: -1,
    })
    this.anims.create({
      key: 'walk',
      frames: [{ key: 'char_walk1' }, { key: 'char_walk2' }],
      frameRate: 4,
      repeat: -1,
    })

    for (let i = 1; i <= 10; i++) {
      const id = i.toString()           // 1 ~ 10
      this.anims.create({
        key       : `npc${id}_idle`,    // 예: npc1_idle
        frames    : [
          { key: `npc${id}_1` },
          { key: `npc${id}_2` },
        ],
        frameRate : 2,
        repeat    : -1,
      })
    }

    /* 시작 맵 & 위치 */
    const worldInfo = await fetchMapData('worldmap')
    await this.loadMap('worldmap', ...worldInfo.start_position)

    /* 브라우저 resize 대응 → 미니맵 위치 조정 */
    this.scale.on(Phaser.Scale.Events.RESIZE, (s) =>
      this.miniCam.setPosition(s.width - 190, 60)
    )
  }

  /* ▽▽ 맵 로드 ▽▽ */
  private async loadMap(mapKey: MapKey, tileX: number, tileY: number) {
    /* ─ 이전 리소스 정리 ─ */
    this.playerCollider?.destroy()
    this.layer?.destroy()
    if (this.npcGroup) {
      this.npcGroup.children.each(o => {
        (o.getData('label') as Phaser.GameObjects.Text)?.destroy()
        o.destroy()                          // 스프라이트 + 물리바디 제거
      })
      this.npcGroup?.clear(true,true)                 // 그룹 비우기
    }

    /* ─ 타일맵 ─ */
    const map = this.make.tilemap({ key: mapKey })
    const tilesetKey =
      mapKey === 'worldmap'
        ? 'worldmap_tileset'
        : mapKey === 'city2'
        ? 'city_tileset'
        : 'dungeon_tileset'

    const ts = map.addTilesetImage(tilesetKey, tilesetKey, 128, 128, 1, 1)!
    const layer = map.createLayer('Tile Layer 1', ts, 0, 0)!
    layer.setCollisionByProperty({ collides: true })

    this.tilemap = map
    this.layer   = layer

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true)

    this.playerCollider = this.physics.add.collider(this.player, layer)
    layer.setDepth(0)
    this.player.setDepth(1)

    /* ─ 맵‑메타(포탈) ─ */
    const mapMeta = await fetchMapData(mapKey)
    this.teleports = mapMeta.teleports

    /* ─ 미니맵 bounds ─ */
    this.miniCam.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    /* ─ 플레이어 위치 ─ */
    this.player.setPosition(
      (tileX + 0.5) * map.tileWidth,
      (tileY + 0.5) * map.tileHeight
    )
    this.events.emit('mapKey', mapMeta.display_name)

    /* ─ NPC 로드 & 배치 ─ */
    await this.spawnNpcs(mapKey)
  }

  /* ▽▽ NPC 로드 / 스폰 ▽▽ */
  private async spawnNpcs(mapKey: MapKey) {
    if(!this.tilemap) return
    this.npcGroup = this.add.group()
    this.npcsMeta = await fetchNpcs(mapKey)

    for(const m of this.npcsMeta){
      /* 애니메이션 (한 번만 생성) */
      const aKey = `npc${m.id}_idle`

      /* 스프라이트 */
      const npc = this.physics.add
        .sprite((m.x+0.5)*this.tilemap!.tileWidth,
                (m.y+0.5)*this.tilemap!.tileHeight,
                `npc${m.id}_1`)
        .setImmovable(true)
        .setDepth(1)
        .play(aKey)

      /* 머리위 라벨 */
      const lbl = this.add.text(
        npc.x,
        npc.y - 68,
        m.npc_type==='shop'?'상점':'대화',
        {fontSize:'14px',color:'#fff',stroke:'#000',strokeThickness:3})
      .setOrigin(0.5)
      .setDepth(2)

      npc.setData('label', lbl)        // 나중에 파괴용
      
      /* 애니메이션 가동 */
      npc.anims.play(aKey)

      this.npcGroup.add(npc)
    }
  }

  /* ▽▽ UPDATE ▽▽ */
  update() {
    /* ─ 플레이어 이동 ─ */
    const speed = 200
    const vx = (this.cursors.left?.isDown ? -1 : this.cursors.right?.isDown ? 1 : 0) * speed
    const vy = (this.cursors.up?.isDown ? -1 : this.cursors.down?.isDown ? 1 : 0) * speed
    this.player.setVelocity(vx, vy)

    this.player.play(vx || vy ? 'walk' : 'stand', true)

    if (!this.tilemap) return

    /* ─ 좌표 HUD ─ */
    const tx = Math.floor(this.player.x / this.tilemap.tileWidth)
    const ty = Math.floor(this.player.y / this.tilemap.tileHeight)
    this.events.emit('coords', { x: tx, y: ty })

    /* ─ 포탈 체크 ─ */
    for (const tp of this.teleports) {
      const hit =
        'x' in tp.from
          ? tp.from.x === tx && tp.from.y === ty
          : tp.from.y === ty &&
            tx >= tp.from.xRange[0] &&
            tx <= tp.from.xRange[1]

      if (hit) {
        const [nx, ny] = tp.to_position
        this.loadMap(tp.to_map as MapKey, nx, ny)
        return
      }
    }

    /* ─ NPC 대화 트리거 (32px 이내) ─ */
    this.npcGroup?.children.iterate((obj) => {
      const npc = obj as Phaser.GameObjects.Sprite
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.x,
        npc.y
      )
      if (dist < TALK_DIST && this.interactingNpcId == 0 && this.closeDialogNpc == false) {   // ★
        const meta = this.npcsMeta.find(
          (n) =>
            n.x === Math.floor(npc.x / this.tilemap!.tileWidth) &&
            n.y === Math.floor(npc.y / this.tilemap!.tileHeight)
        )
        if (meta) {
          console.log('체크:'+meta.name)
          this.interactingNpcId = meta.id          // 잠금
          this.events.emit('openNpcDialog', meta)  // React → NPCDialog
        }
      }
      /* ─ 쿨다운 해제 ─ */
      if (this.closeDialogNpc && dist > RESET_DIST) {
        const meta = this.npcsMeta.find(
          (n) =>
            n.x === Math.floor(npc.x / this.tilemap!.tileWidth) &&
            n.y === Math.floor(npc.y / this.tilemap!.tileHeight)
        )
        if (meta && meta.id == this.interactingNpcId) {
          console.log('쿨다운 해제:'+meta.name)
          this.interactingNpcId = 0                  // 다시 대화 가능
          this.closeDialogNpc = false
        }
      }
    })
  }
}
