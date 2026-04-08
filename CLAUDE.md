# Arkacia — Web RPG Game

브라우저 기반 2D 실시간 멀티플레이어 RPG. 몬스터 전투, NPC 상점, 맵 이동, 실시간 채팅.

## 기술 스택

- **Backend**: Flask 2.3 + SQLAlchemy 2.0 + Flask-SocketIO + eventlet
- **Frontend**: React 18 + TypeScript + Phaser 3.90 + MUI 7 + Vite 6
- **Database**: PostgreSQL 14 + Redis 7
- **Infra**: Docker Compose, Nginx reverse proxy
- **CI/CD**: GitHub Actions (pytest → vitest → Docker integration → GHCR deploy)

## 디렉토리 구조

```
backend/
  app.py              # Flask 앱 초기화, Socket.IO 이벤트, 몬스터 AI 루프
  models.py           # SQLAlchemy 모델 (User, Character, CharacterItem, Map, NPC, Monster, Item)
  auth.py             # 회원가입/로그인 (auth_bp, url_prefix=/auth)
  auth_admin.py       # 관리자 인증 (admin_auth_bp, url_prefix=/auth)
  characters.py       # 캐릭터 CRUD + 경험치/레벨업/이동 (characters_bp, url_prefix=/api)
  items.py            # 아이템 CRUD + 사용 (items_bp, url_prefix=/api)
  shop.py             # 상점 구매/판매 (shop_bp, url_prefix=/api)
  maps.py             # 맵 CRUD (maps_bp, url_prefix=/api)
  npcs.py             # NPC CRUD + 대화 (npcs_bp, url_prefix=/api)
  monsters.py         # 몬스터 조회 (monsters_bp, url_prefix=/api)
  routes.py           # 유저 관리 CRUD + 밴/언밴 (bp, url_prefix=/api)
  conftest.py         # pytest 공통 픽스처 (SQLite in-memory)
  tests/              # 백엔드 테스트 (74%+ 커버리지)

frontend/src/
  App.tsx             # React Router 설정
  MyScene.tsx         # Phaser 게임 씬 (맵 렌더링, 전투, NPC 상호작용)
  PhaserGame.tsx      # Phaser + React 브릿지 (UI 오버레이, 채팅)
  pages/              # LoginPage, CharacterSelect, CharacterDialog
  ui/                 # InventoryDialog, ShopDialog, NpcDialog, MenuPopover
  admin/              # 관리자 대시보드 (api.ts + pages/)
  utils/              # API 유틸리티 (character, items, map, npc, sfx)
  __tests__/          # 프론트엔드 테스트 (86%+ 커버리지)

scripts/
  smoke-test.sh       # 스모크 테스트 (엔드포인트 헬스체크)
  integration-test.sh # 통합 테스트 (핵심 유저 플로우 E2E)
```

## 빌드 & 테스트 명령

```bash
# 백엔드 테스트
cd backend && python3 -m pytest -v --tb=short

# 프론트엔드 테스트
cd frontend && npx vitest run

# Docker Compose 로컬 실행
docker-compose up -d --build

# 통합 테스트 (Docker 환경 필요)
bash scripts/integration-test.sh
```

## 환경변수

- `SECRET_KEY` — **필수**. Flask 세션 암호화 키 (`openssl rand -hex 32`)
- `DATABASE_URI` — PostgreSQL 연결 문자열
- `REDIS_URL` — Redis 연결 URL
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — 관리자 인증
- `CORS_ORIGINS` — 허용 출처 (프로덕션에서 도메인 지정 필수)
- 전체 목록: `.env.example` 참조

## 핵심 규칙

### Blueprint 등록
새 Blueprint 추가 시 **반드시** 두 곳에 등록:
1. `backend/app.py` — `app.register_blueprint(new_bp, url_prefix="/api")`
2. `backend/conftest.py` — 동일하게 등록 (테스트에서도 라우트 인식)

### 코드 스타일
- **Python**: PEP 8, snake_case, 한국어 주석 유지
- **TypeScript**: strict 모드, camelCase, ESLint 준수
- **한국어 주석**: 기존 한국어 주석은 한국어로 유지

### Git 규칙
- main 브랜치 직접 push 금지 — PR을 통해서만 머지
- 큰 변경 후 반드시 테스트 실행
- `.env` 파일 커밋 금지
- 커밋 메시지는 한국어로 작성

## CI 파이프라인

4-job 구조:
1. **Backend Tests** — pytest + coverage
2. **Frontend Tests** — vitest + tsc --noEmit + coverage
3. **Integration Tests** — Docker Compose + smoke + E2E
4. **Test Report** — dorny/test-reporter + 커버리지 PR 코멘트

## API 패턴

- 라우트 핸들러: `data = request.get_json() or {}` 패턴
- 에러 응답: 400 (검증), 401 (인증), 404 (미존재), 500 (서버)
- 모델: `to_dict()` 메서드로 JSON 직렬화
- 프론트엔드 API 호출: `fetch(\`${import.meta.env.VITE_API_BASE_URL}/api/...\`)`
- admin API: `admin/api.ts` 공용 함수 사용, `!res.ok` 체크 필수
