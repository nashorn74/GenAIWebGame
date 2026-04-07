# Arkacia - Web RPG Game

브라우저 기반 2D 실시간 멀티플레이어 RPG 게임.
몬스터 전투, NPC 상점, 맵 이동, 실시간 채팅을 지원합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Flask 2.3, SQLAlchemy 2.0, Flask-SocketIO, eventlet |
| Frontend | React 18, TypeScript, Phaser 3.90, MUI 7, Vite 6 |
| Database | PostgreSQL 14 |
| Cache/PubSub | Redis 7 |
| Realtime | Socket.IO (WebSocket) |
| Infra | Docker, Docker Compose, Nginx |
| CI/CD | GitHub Actions (테스트 → 통합 테스트 → Docker 이미지 빌드 → GHCR 배포) |

## 프로젝트 구조

```
├── backend/                  # Flask REST API + Socket.IO 서버
│   ├── app.py                # 메인 앱 (DB 초기화, 소켓 이벤트, 몬스터 AI)
│   ├── models.py             # SQLAlchemy 모델 (User, Character, Item, Map, NPC, Monster)
│   ├── auth.py               # 인증 (회원가입/로그인)
│   ├── auth_admin.py         # 관리자 인증 (환경변수 기반)
│   ├── characters.py         # 캐릭터 CRUD + 경험치/레벨업/이동
│   ├── items.py              # 아이템 CRUD + 사용
│   ├── shop.py               # 상점 구매/판매
│   ├── maps.py               # 맵 CRUD
│   ├── npcs.py               # NPC CRUD + 대화
│   ├── monsters.py           # 몬스터 조회
│   ├── routes.py             # 유저 관리 (CRUD, 밴/언밴)
│   ├── conftest.py           # pytest 공통 픽스처
│   ├── Dockerfile            # 프로덕션 이미지 (python:3.11-slim)
│   └── tests/                # 백엔드 테스트 (74%+ 커버리지)
├── frontend/                 # React + Phaser 클라이언트
│   ├── src/
│   │   ├── App.tsx           # 라우터 설정
│   │   ├── MyScene.tsx       # Phaser 게임 씬 (전투, 이동, NPC 상호작용)
│   │   ├── PhaserGame.tsx    # Phaser + React 통합 (UI 오버레이, 채팅)
│   │   ├── pages/            # 로그인, 캐릭터 선택/생성
│   │   ├── ui/               # 인벤토리, 상점, NPC 대화, 메뉴
│   │   ├── admin/            # 관리자 대시보드 (유저/캐릭터/아이템/맵/NPC 관리)
│   │   └── utils/            # API 유틸리티 (character, items, map, npc, sfx)
│   ├── public/               # 정적 에셋 (스프라이트, 타일맵, BGM)
│   ├── nginx.conf            # 프로덕션 Nginx (리버스 프록시 + SPA)
│   ├── Dockerfile            # 프로덕션 이미지 (멀티스테이지: node build → nginx)
│   └── Dockerfile.dev        # 개발 이미지 (Vite HMR)
├── scripts/
│   ├── smoke-test.sh         # 스모크 테스트 (엔드포인트 헬스체크)
│   ├── integration-test.sh   # 통합 테스트 (핵심 유저 플로우 E2E)
│   └── smoke-to-junit.sh     # 테스트 출력 → JUnit XML 변환
├── docker-compose.yml        # 로컬 개발 환경
├── docker-compose.prod.yml   # 프로덕션 배포
├── docker-compose.ci.yml     # CI 파이프라인용
├── .env.example              # 환경변수 템플릿
└── .github/workflows/
    ├── test.yml              # CI: 유닛 테스트 + 통합 테스트 + 리포트
    └── deploy.yml            # CD: 테스트 → Docker 이미지 빌드 → GHCR 푸시
```

## 주요 기능

### 게임플레이
- **실시간 멀티플레이어**: Socket.IO 기반 WebSocket 통신, Redis pub/sub 글로벌 채팅
- **전투 시스템**: 몬스터 AI (2초 주기 순찰/어그로/공격), 데미지 계산, 넉백, 리스폰
- **캐릭터 성장**: XP 기반 레벨업 (HP/MP/스탯 증가), 전사/궁수/마법사 직업
- **경제 시스템**: NPC 상점 구매/판매, 골드 기반 거래, 포션/무기/방어구
- **맵 시스템**: 타일맵 기반 충돌, 맵 간 텔레포트 (worldmap, city2, dungeon1)

### 관리자 대시보드
- 유저 관리 (조회, 밴/언밴, 삭제)
- 캐릭터/아이템/맵/NPC CRUD
- 환경변수 기반 인증 (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)

---

## 로컬 개발 환경

### 사전 요구사항

- Docker & Docker Compose
- (선택) Node.js 20+, Python 3.11+ — Docker 없이 직접 실행 시

### Docker Compose로 실행

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 SECRET_KEY 등 값을 수정

# 2. 컨테이너 빌드 & 실행
docker-compose up -d --build

# 3. 서비스 상태 확인
docker-compose ps

# 4. 브라우저에서 접속
#    프론트엔드: http://localhost:5173 (Vite HMR)
#    백엔드 API: http://localhost:5000/api/maps

# 5. 로그 확인
docker-compose logs -f backend

# 6. 종료
docker-compose down          # 컨테이너 종료
docker-compose down -v       # 컨테이너 + DB 볼륨 삭제
```

**개발 환경 구성:**
| 서비스 | 포트 | 설명 |
|--------|------|------|
| Frontend (Vite) | 5173 | HMR 지원, 코드 수정 시 자동 반영 |
| Backend (Flask) | 5000 | DEBUG 모드, 자동 리로드 |
| PostgreSQL | 5432 | 직접 접속 가능 (`psql -h localhost -U myuser -d my_database`) |
| Redis | 6379 | 직접 접속 가능 (`redis-cli`) |

### 직접 실행 (Docker 없이)

```bash
# PostgreSQL, Redis가 로컬에서 실행 중이어야 합니다

# Backend
cd backend
pip install -r requirements.txt
export SECRET_KEY=my-dev-secret
export DATABASE_URI=postgresql://myuser:mypass@localhost:5432/my_database
export REDIS_URL=redis://localhost:6379/0
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=devpass123
python app.py

# Frontend (별도 터미널)
cd frontend
npm install
npm run dev
```

---

## 프로덕션 배포

### 방법 1: GHCR 이미지 사용 (권장)

CI/CD 파이프라인이 main 브랜치에 머지 시 자동으로 Docker 이미지를 빌드하여 GitHub Container Registry(GHCR)에 푸시합니다.

```bash
# 1. 서버에 docker-compose.prod.yml과 .env 파일 준비
scp docker-compose.prod.yml your-server:~/arkacia/
scp .env.example your-server:~/arkacia/.env

# 2. 서버에서 환경변수 설정
ssh your-server
cd ~/arkacia
vi .env
```

`.env` 파일 — **반드시 아래 값을 변경하세요**:
```env
SECRET_KEY=<openssl rand -hex 32 로 생성한 랜덤 키>
POSTGRES_PASSWORD=<강력한 DB 비밀번호>
ADMIN_USERNAME=<관리자 계정>
ADMIN_PASSWORD=<강력한 관리자 비밀번호>
CORS_ORIGINS=https://your-domain.com
```

```bash
# 3. GHCR 로그인 (GitHub Personal Access Token 필요, read:packages 권한)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 4. 이미지 pull & 실행
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 5. 상태 확인
docker-compose -f docker-compose.prod.yml ps
curl http://localhost/api/maps   # Nginx가 80 포트에서 서빙

# 6. 업데이트 시 (새 이미지 배포)
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --remove-orphans
```

**프로덕션 아키텍처:**
```
Client → Nginx (:80)
           ├── /api/*        → Backend Flask (:5000)
           ├── /auth/*       → Backend Flask (:5000)
           ├── /socket.io/*  → Backend Flask (:5000, WebSocket upgrade)
           └── /*            → SPA index.html (React)
```

### 방법 2: 직접 빌드 & 배포

GHCR을 사용하지 않고 서버에서 직접 빌드하는 경우:

```bash
# 소스 클론
git clone https://github.com/nashorn74/GenAIWebGame.git
cd GenAIWebGame

# .env 설정 (위 .env 내용 참고)
cp .env.example .env
vi .env

# 직접 빌드 & 실행
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

> **참고**: `docker-compose.prod.yml`은 기본적으로 GHCR 이미지를 참조합니다.
> 직접 빌드 시 `image:` 대신 `build:` 설정으로 변경하거나,
> `docker build -t ghcr.io/nashorn74/genaiwebgame-backend:latest ./backend` 등으로 로컬 태그를 생성하세요.

### 보안 체크리스트

- [ ] `SECRET_KEY`에 `openssl rand -hex 32`로 생성한 랜덤 키 설정
- [ ] `CORS_ORIGINS`에 실제 도메인 설정 (기본값 `*`는 모든 출처 허용)
- [ ] `ADMIN_PASSWORD`에 강력한 비밀번호 설정 (12자 이상 권장)
- [ ] `POSTGRES_PASSWORD`에 강력한 비밀번호 설정
- [ ] HTTPS 설정 (Nginx 앞단에 Certbot/Cloudflare 등)

---

## 테스트

### 유닛 테스트

```bash
# Backend (pytest, 74%+ 커버리지)
cd backend
pip install -r requirements-dev.txt
pytest -v                         # 전체 실행
pytest -v --cov --cov-report=html # 커버리지 리포트 포함

# Frontend (vitest, 86%+ 커버리지)
cd frontend
npm install
npm test                          # vitest 실행
npx vitest run --coverage         # 커버리지 리포트 포함
npx tsc --noEmit                  # TypeScript 타입 체크
```

### 통합 테스트 (Docker 환경)

Docker Compose로 전체 스택을 띄우고 핵심 유저 플로우를 E2E 검증합니다:

```bash
# 1. CI용 이미지 빌드
docker build -t arkacia-backend:ci ./backend
docker build -t arkacia-frontend:ci ./frontend

# 2. CI 환경 실행
docker-compose -f docker-compose.ci.yml up -d
# 헬스체크 통과 대기 (약 15-30초)

# 3. 스모크 테스트
bash scripts/smoke-test.sh

# 4. 통합 테스트 (핵심 유저 플로우)
bash scripts/integration-test.sh

# 5. 정리
docker-compose -f docker-compose.ci.yml down -v
```

**통합 테스트 플로우** (`scripts/integration-test.sh`):
1. 회원가입 → 중복 체크 → 로그인 → 잘못된 비밀번호
2. 캐릭터 생성 → 목록 조회 → 상세 조회 → 이름 변경
3. 경험치 획득 → 레벨업
4. 맵 목록 조회 → 맵 이동
5. 아이템 생성 → NPC 생성 → 상점 구매 (골드 검증) → 판매 (골드 검증) → 골드 부족 실패
6. HP 조정 → 포션 사용 → 회복량/HP 검증
7. NPC 대화 엔드포인트
8. 정리 (아이템 판매 → 캐릭터 삭제 → 아이템/NPC/유저 삭제)

---

## CI/CD 파이프라인

### 테스트 워크플로우 (`test.yml`)

push 및 PR 시 자동 실행됩니다.

```
┌──────────────────┐    ┌───────────────────┐
│ Backend Tests    │    │ Frontend Tests    │
│ (pytest, py3.11) │    │ (vitest, node 20) │
│ + coverage       │    │ + tsc --noEmit    │
└────────┬─────────┘    └────────┬──────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │ Integration Tests     │
         │ (Docker Compose)      │
         │ smoke + E2E user flow │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │ Test Report & Coverage│
         │ (PR 코멘트, 리포트)    │
         └───────────────────────┘
```

| Job | 내용 |
|-----|------|
| **Backend Tests** | pytest 실행, JUnit XML + 커버리지 리포트 생성 |
| **Frontend Tests** | TypeScript 타입 체크 + vitest 실행, JUnit XML + 커버리지 리포트 생성 |
| **Integration Tests** | Docker 이미지 빌드 → docker-compose.ci.yml → smoke-test.sh + integration-test.sh |
| **Test Report** | dorny/test-reporter로 PR에 결과 표시, 커버리지 요약 PR 코멘트 |

### 배포 워크플로우 (`deploy.yml`)

main 브랜치에 push 시 자동 실행됩니다.

```
test.yml (전체 테스트) → Docker 이미지 빌드 → GHCR 푸시
```

1. `test.yml` 워크플로우를 재사용하여 전체 테스트 실행
2. 테스트 통과 시 Docker 이미지 빌드 (`backend`, `frontend`)
3. GHCR에 `latest` + `커밋 SHA` 태그로 푸시

**배포된 이미지:**
```
ghcr.io/nashorn74/genaiwebgame-backend:latest
ghcr.io/nashorn74/genaiwebgame-backend:<commit-sha>
ghcr.io/nashorn74/genaiwebgame-frontend:latest
ghcr.io/nashorn74/genaiwebgame-frontend:<commit-sha>
```

### 브랜치 보호 규칙

main 브랜치에 다음 보호 규칙이 설정되어 있습니다:

- PR을 통해서만 머지 가능 (직접 push 차단)
- CI Status Check 필수 (Backend Tests, Frontend Tests, Integration Tests 모두 통과)
- Force push 차단
- 브랜치 삭제 차단

---

## 환경변수

| 변수 | 기본값 (dev) | 설명 |
|------|-------------|------|
| `SECRET_KEY` | `dev-fallback-key` | Flask 세션 암호화 키. **프로덕션에서 반드시 변경** |
| `DATABASE_URI` | (docker-compose 내부) | PostgreSQL 연결 문자열 |
| `REDIS_URL` | `redis://redis:6379/0` | Redis 연결 URL |
| `ADMIN_USERNAME` | `admin` | 관리자 대시보드 계정 |
| `ADMIN_PASSWORD` | `devpass123` | 관리자 비밀번호. **프로덕션에서 반드시 변경** |
| `CORS_ORIGINS` | `*` | 허용할 CORS 출처. **프로덕션에서 도메인 지정** |
| `DB_POOL_SIZE` | `20` | DB 커넥션 풀 크기 |
| `DB_MAX_OVERFLOW` | `30` | DB 커넥션 풀 오버플로우 |
| `DB_POOL_TIMEOUT` | `30` | DB 커넥션 풀 타임아웃 (초) |
| `DB_POOL_RECYCLE` | `1800` | DB 커넥션 재활용 주기 (초) |

---

## API 엔드포인트

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/register` | 회원가입 |
| POST | `/auth/login` | 로그인 |
| POST | `/auth/admin_login` | 관리자 로그인 |

### 캐릭터
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/characters` | 캐릭터 목록 (`?user_id=N` 필터) |
| GET | `/api/characters/:id` | 캐릭터 상세 |
| POST | `/api/characters` | 캐릭터 생성 (유저당 최대 3개) |
| PUT | `/api/characters/:id` | 캐릭터 수정 |
| DELETE | `/api/characters/:id` | 캐릭터 삭제 |
| PATCH | `/api/characters/:id/gain_exp` | 경험치 부여 |
| PATCH | `/api/characters/:id/stats` | 스탯 수정 |
| PATCH | `/api/characters/:id/move` | 맵 이동 |

### 아이템
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/items` | 아이템 목록 (`?category=potion` 필터) |
| GET | `/api/items/:id` | 아이템 상세 |
| POST | `/api/items` | 아이템 생성 |
| PUT | `/api/items/:id` | 아이템 수정 |
| DELETE | `/api/items/:id` | 아이템 삭제 |
| POST | `/api/items/use` | 아이템 사용 (포션 등) |

### 상점
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/shops/:npc_id/buy` | 아이템 구매 |
| POST | `/api/shops/:npc_id/sell` | 아이템 판매 |

### 맵 / NPC / 유저
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/maps` | 맵 목록 |
| GET | `/api/maps/:key` | 맵 상세 (타일맵 레이어 포함) |
| GET | `/api/npcs` | NPC 목록 |
| GET | `/api/npcs/:id/dialog` | NPC 대화 |
| GET | `/api/users` | 유저 목록 |
| DELETE | `/api/users/:id` | 유저 삭제 |

---

## 라이선스

MIT
