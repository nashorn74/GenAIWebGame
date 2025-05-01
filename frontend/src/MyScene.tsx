import Phaser from 'phaser'
import { MapTeleport, fetchMapData } from './utils/map'
import { fetchNpcs, NpcDTO } from './utils/npc'
import { io, Socket } from 'socket.io-client';
import { CharacterDTO } from './utils/character'

type MapKey = 'worldmap' | 'city2' | 'dungeon1'
const TALK_DIST   = 48   // 대화 시작
const RESET_DIST  = 64   // 다시 대화 가능해지는 거리

export class MyScene extends Phaser.Scene {
  /* ▽▽ 필드 ▽▽ */
  private socket!: Socket;
  /** id ➜ (container, nameText) */
  private actors = new Map<number, Phaser.GameObjects.Container>();
  private monsters = new Map<number, Phaser.GameObjects.Container>();
  private currentMap!: MapKey

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

  private isChangingMap = false;         // ★ 전환 중 플래그
  private meId = Number(sessionStorage.getItem('charId'));
  private monstersMeta: Record<number, { max_hp:number }> = {};
  private monsterQueue: any[] = [];   //  ← ① 추가
  private mapReady = false;           //  ← ② 추가

  upsertMonster = (m:any)=>{
    if(!this.mapReady){          // 아직 맵 세팅 중이면
      this.monsterQueue.push(m); //  → 큐에 적재
      return;
    }
    this.monstersMeta[m.id] = { max_hp: m.max_hp };
    this.spawnOrUpdateMonster(m);
  };

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

    // 몬스터 6장 한꺼번에
    [
      'monster1_stand1','monster1_stand2',
      'monster4_stand1','monster4_stand2',
      'monster5_stand1','monster5_stand2',
    ].forEach(k => this.load.image(k, `assets/${k}.png`))

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
    /*const me: CharacterDTO = JSON.parse(sessionStorage.getItem('myChar')!);
    const myLabel = this.add.text(0, -64, me.name,
      { fontSize:'14px', color:'#fff', stroke:'#000', strokeThickness:3 })
      .setOrigin(0.5)
    this.player.add(myLabel)         // sprite → Container 대신 add() 가능*/

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

    /* ── ① socket 연결 ── */
    this.socket = io(import.meta.env.VITE_API_BASE_URL);

    /* socket 연결 직후 – 디버그용 콘솔 */

    // 로그인된 내 캐릭터 id 로 join
    const myCharId = Number(sessionStorage.getItem('charId'));

    /* 1. URL 확인 */
    console.log('SOCKET URL =', import.meta.env.VITE_API_BASE_URL)

    /* 2. connect 실패 시 reason 출력 */
    this.socket.io.on('error',  (err)=>console.error('socket error', err))
    this.socket.io.on('reconnect_error', console.error)
    this.socket.io.on('reconnect_failed', console.error)

    this.socket.on("chat_message", (msg: { sender:string; text:string; ts:number }) => {
      console.log("chat_message!!!!!!!");
      console.log(msg);
      this.events.emit("chat_message", msg)
    })

    /* 3. 연결 후에 join_map 보내는지 확인 */
    this.socket.on('connect', () => {
      console.log('[socket] connected id=', this.socket.id)
    })
    this.socket.on('disconnect',()=>console.log('[socket] disconnect'))

    /* ───────────────────────────────────────────
        “actors” Map 은 내 캐릭터도 포함해서 id 로 접근
        (컨테이너: [bodySprite, nameText])
    ─────────────────────────────────────────── */
    /* 현재 방 플레이어 목록 한번에 수신 */
    this.socket.on('current_players', (arr: CharacterDTO[]) => {
      arr
        .filter(c => c.id !== myCharId)     // ★ 내 캐릭터 제거
        .forEach(c => this.spawnOrUpdateActor(c));
    });

    /* 새 플레이어 입장 */
    this.socket.on('player_spawn', (c: CharacterDTO) => {
      if (c.id !== myCharId) this.spawnOrUpdateActor(c);
    });

    /* 이동 업데이트 */
    this.socket.on('player_move', (p:{id:number,x:number,y:number}) => {
      const cont = this.actors.get(p.id);
      if (cont) cont.setPosition(p.x, p.y);
    });

    /* 퇴장 */
    this.socket.on('player_despawn', ({ id }) => {
      this.removeActor(id);
    });

    this.socket.on('current_monsters', arr =>
      arr.forEach(this.upsertMonster)          // ← 수정!
    );
    this.socket.on('monster_spawn',    this.upsertMonster); // ← 수정!
    this.socket.on('monster_move', p => {
      const cont = this.monsters.get(p.id)
      if (!cont || !this.tilemap) return
    
      const dstX = (p.x + 0.5) * this.tilemap.tileWidth
      const dstY = (p.y + 0.5) * this.tilemap.tileHeight
    
      // 이미 그 위치라면 아무것도 안 함
      if (Math.abs(cont.x - dstX) < 1 && Math.abs(cont.y - dstY) < 1) return

      if(!this.monsters.has(p.id)){
        this.upsertMonster({...p, sprite1:'dummy.png', sprite2:'dummy.png', species:''});
      }
    
      // 8-프레임(≈0.13s) 동안 선형 이동 → “뚝” 사라지는 느낌 제거
      this.tweens.add({
        targets: cont,
        x: dstX,
        y: dstY,
        duration: 130,            // 8 프레임 @60 FPS
        ease: 'Linear'
      })
    })
    this.socket.on('monster_despawn', ({id}) => {
      this.monsters.get(id)?.destroy(true)
      this.monsters.delete(id)
    })

    /* --- 소켓 이벤트 추가 --- */
    this.socket.on('monster_hit', (info)=>{
      const cont = this.monsters.get(info.id);
      if (!cont || !this.tilemap) return;
    
      /* ① 카메라 & 히트-스톱 */
      this.cameras.main.shake(100,.01);
      this.time.timeScale=.05;
      this.time.delayedCall(80,()=>this.time.timeScale=1);
    
      /* ② HP 바 */
      const bar = cont.getData('hpBar') as Phaser.GameObjects.Graphics;
      if (bar){
        const ratio = info.hp / (this.monstersMeta[info.id]?.max_hp??info.hp);
        this.tweens.add({targets:bar,scaleX:ratio,duration:120,ease:'Linear'});
      }
    
      /* ③ 데미지 텍스트 */
      const dmgText = this.add.text(0,-80,`-${info.dmg}`,{fontSize:'28px',
        color:'#ff4444',stroke:'#000',strokeThickness:4}).setOrigin(0.5);
      cont.add(dmgText);
      this.tweens.add({targets:dmgText,y:dmgText.y-40,alpha:0,
        duration:600,ease:'Cubic.easeOut',onComplete:()=>dmgText.destroy()});
    
      /* ───────── NEW : 넉백 ───────── */
      const dstX = (info.x+.5)*this.tilemap.tileWidth;
      const dstY = (info.y+.5)*this.tilemap.tileHeight;
    
      // 서버 좌표까지 바로 이동시키지 말고,
      //  1) 60 ms 동안 반대방향으로 16 px 튕긴 뒤
      //  2) 120 ms 에 서버 좌표로 수렴
      const dirX = Phaser.Math.Clamp(dstX-cont.x,-1,1);
      const dirY = Phaser.Math.Clamp(dstY-cont.y,-1,1);
      const knockX = cont.x + dirX*16;
      const knockY = cont.y + dirY*16;
    
      this.tweens.chain({
        targets:cont,
        tweens:[
          {x:knockX,y:knockY,duration:60,ease:'Quad.easeOut'},
          {x:dstX,y:dstY,duration:120,ease:'Quad.easeIn'}
        ]
      });
    });

    /* ────────── NEW: 몬스터→플레이어 전투 이벤트 ────────── */
    this.socket.on('player_hit', (p:{id:number,dmg:number,hp:number})=>{
      if (p.id !== this.meId) return;

      // 장난감용 콘솔
      console.log(`[HIT] ${p.id} -${p.dmg}  HP=${p.hp}`);

      /* 👉 React(PhaserGame) 로 HP 패치 전송 */
      this.events.emit('charUpdate', { hp: p.hp });

      /* ── NEW: 빨간 플래시 & 살짝 밀림 ── */
      // ① 섬광 오버레이
      const flash = this.add.rectangle(0,0,this.cameras.main.width,
                  this.cameras.main.height,0xff0000,1)
                  .setOrigin(0).setScrollFactor(0).setDepth(99);
      this.tweens.add({targets:flash,alpha:0,duration:120,
                      onComplete:()=>flash.destroy()});

      // ② 캐릭터 뒤로 점프-백
      /*const dir = new Phaser.Math.Vector2(this.player.body!.velocity)
                    .normalize().scale(-12);       // 반대방향 12 px
      this.tweens.add({targets:this.player,x:'+'+dir.x,y:'+'+dir.y,
                      yoyo:true,duration:90,ease:'Quad.easeOut'});*/
    });

    this.socket.on('player_respawn', (r:{
      id:number, map_key:string, x:number, y:number, hp:number
    })=>{
      console.log(`[player_respawn] ${r.id} ${this.meId}`);
      if (r.id !== this.meId) return;

      console.log(`[player_respawn] ${r.id} ${this.currentMap} → ${r.map_key} ${r.x} ${r.y} ${r.hp}`);

      /* 맵 전환·위치 이동은 기존 코드 그대로 */
      this.loadMap(r.map_key as any,
                  r.x/this.tilemap!.tileWidth - 0.5,
                  r.y/this.tilemap!.tileHeight - 0.5);
      this.player.setPosition(r.x, r.y);

      /* 👉 HP 회복 & 좌표 패치 */
      this.events.emit('charUpdate', {
        hp : r.hp,
        x  : r.x,
        y  : r.y,
        map_key : r.map_key
      });
    });

    this.socket.on('exp_gain', (e:{
      char_id:number, exp:number, total_exp:number, level:number, level_up?:boolean
    })=>{
      if (e.char_id !== this.meId) return;

      console.log(`[EXP] +${e.exp} → Lv.${e.level}`);

      /* 👉 EXP / 레벨 패치 */
      this.events.emit('charUpdate', {
        exp   : e.total_exp,
        level : e.level
      });

      /* ───── 눈에 띄는 레벨-업 연출 ───── */
      if (e.level_up){
        /* 1) “LEVEL UP!” 텍스트 팝 */
        const txt = this.add.text(
          this.player.x, this.player.y - 120,
          `LEVEL ${e.level} UP!`, {
            fontSize : '42px',
            fontStyle: 'bold',
            color    : '#ffeb3b',
            stroke   : '#000',
            strokeThickness: 6
          }
        ).setOrigin(0.5).setScale(0).setDepth(10);

        this.tweens.add({
          targets  : txt,
          scale    : 1,
          y        : txt.y - 40,
          alpha    : 0,
          duration : 1500,
          ease     : 'Back.easeOut',
          onComplete: ()=>txt.destroy()
        });

        /* 2) 화이트-플래시 & 링-웨이브 */
        this.cameras.main.flash(250, 255,255,255);

        const ring = this.add.circle(
          this.player.x, this.player.y, 0, 0xffff66, .3
        ).setDepth(10);

        this.tweens.add({
          targets : ring,
          radius  : 200,
          alpha   : 0,
          duration: 600,
          ease    : 'Cubic.easeOut',
          onComplete: ()=>ring.destroy()
        });
      }
    });
    /* ─────────────────────────────────────────────────── */

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

    /* 내 캐릭터까지 포함한 컨테이너를 만들어 map 위에 올린다 */
    const me: CharacterDTO = JSON.parse(sessionStorage.getItem('myChar')!);
    this.spawnOrUpdateActor(me);               // ← 이름 라벨도 생김

    /* 시작 맵 & 위치 */
    const worldInfo = await fetchMapData('worldmap')
    await this.loadMap('worldmap', ...worldInfo.start_position)

    /* 브라우저 resize 대응 → 미니맵 위치 조정 */
    this.scale.on(Phaser.Scale.Events.RESIZE, (s) =>
      this.miniCam.setPosition(s.width - 190, 60)
    )
  }

  /* 컨테이너 = [sprite, nameText] */
  private spawnOrUpdateMonster(m: any) {
    const existed = this.monsters.get(m.id)
    if(!this.tilemap){             // 안전 가드
      return;
    }
    // ─ ① 타일 좌표 → 픽셀 좌표 변환
    const tx = (m.x + 0.5) * this.tilemap!.tileWidth   // 128 px 기준
    const ty = (m.y + 0.5) * this.tilemap!.tileHeight
  
    if (existed) {               // 이미 있으면 위치만 갱신
      existed.setPosition(tx, ty)
      return
    }
  
    // ─ ② 스프라이트 키 계산
    const key1 = m.sprite1.split('/').pop()!.replace('.png', '')
    const key2 = m.sprite2.split('/').pop()!.replace('.png', '')
  
    const body    = this.add.sprite(0, 0, key1)
    const idleKey = `${m.id}_idle`
    if (!this.anims.exists(idleKey)) {
      this.anims.create({
        key   : idleKey,
        frames: [{ key: key1 }, { key: key2 }],
        frameRate: 2, repeat: -1,
      })
    }
    body.play(idleKey)
  
    const label = this.add.text(0, -60, m.species,
      { fontSize: '14px', color: '#fff', stroke:'#000', strokeThickness:3 }
    ).setOrigin(0.5)
    const bar = this.add.graphics().fillStyle(0xff4444).fillRect(-32,-58,64,6);  
    const cont = this.add.container(tx, ty, [body, label]).setDepth(1)
    cont.add(bar);
    cont.setData('hpBar', bar);
    this.monsters.set(m.id, cont)
  }

  /* ───────────────── ① create or update ───────────────── */
  private spawnOrUpdateActor(c: CharacterDTO) {
    if (c.id === this.meId) return      // ★ 내 컨테이너 생성 금지

    /* 이미 있으면 위치만 갱신 */
    const existed = this.actors.get(c.id);
    if (existed) { existed.setPosition(c.x, c.y); return; }

    /* 새로 만든다 : 컨테이너 = [bodySprite, nameText] */
    const body  = this.add.sprite(0, 0, 'char_stand1');
    const label = this.add.text(0, -64, c.name,
      { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 }
    ).setOrigin(0.5);

    const container = this.add.container(c.x, c.y, [body, label]);
    container.setDepth(1);

    this.actors.set(c.id, container);
  }

  /* ───────────────── ② 완전 제거 ───────────────── */
  private removeActor(id: number) {
    const cont = this.actors.get(id);
    if (!cont) return;
    cont.destroy(true);          // 내부 children 도 함께 제거
    this.actors.delete(id);
  }  

  /* ▽▽ 맵 로드 ▽▽ */
  private async loadMap(mapKey: MapKey, tileX: number, tileY: number) {
    /* 이미 전환 중이면 무시 */
    if (this.isChangingMap) return
    this.isChangingMap = true               // ★ 전환 잠금

    this.mapReady = false;

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

    /* 내 컨테이너는 파괴 후 재생성 → 고스트 방지 */
    /*this.actors.get(this.meId)?.destroy(true)
    this.actors.delete(this.meId)
    const me: CharacterDTO =
      JSON.parse(sessionStorage.getItem('myChar')!)
    me.x = this.player.x;  me.y = this.player.y
    this.spawnOrUpdateActor(me)              // 새 컨테이너*/

    /* ─ NPC 로드 & 배치 ─ */
    await this.spawnNpcs(mapKey)

    /* 서버에 방 입장 (맵이 달라질 때만) */
    if (mapKey !== this.currentMap) {
      this.socket.emit('join_map', {
        character_id: this.meId,
        map_key: mapKey
      })
    }
    this.currentMap = mapKey

    /* 다른 플레이어 전부 제거 → current_players 다시 받을 때만 렌더 */
    this.actors.forEach((_, id) => this.removeActor(id))

    /* ─ 이전 맵 몬스터 전부 제거 ─ */
    this.monsters.forEach((cont) => cont.destroy(true));
    this.monsters.clear();

    this.mapReady = true;          // 이제 화면 그릴 준비 완료
    this.monsterQueue.forEach(this.upsertMonster); // 큐 비우기
    this.monsterQueue.length = 0;

    this.isChangingMap = false              // ★ 잠금 해제
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

    if (this.anims.exists('stand')) {      // ← 추가
      this.player.play(vx || vy ? 'walk' : 'stand', true);
    }                                       // ← 추가

    // 전환 중엔 move 패킷 보내지 않음
    if (!this.isChangingMap && (vx || vy)) {
      this.socket.emit('move', {
        character_id: this.meId,
        map_key     : this.currentMap,
        x: this.player.x,
        y: this.player.y
      });
    }

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
