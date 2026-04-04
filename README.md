# Arkacia - Web RPG Game

브라우저 기반 2D 실시간 멀티플레이어 RPG 게임.
몬스터 전투, NPC 상점, 맵 이동, 실시간 채팅을 지원합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Flask 2.3, SQLAlchemy 2.0, Flask-SocketIO, eventlet |
| Frontend | React 18, TypeScript, Phaser 3.90, Vite |
| Database | PostgreSQL 14 |
| Cache | Redis 7 |
| Realtime | Socket.IO |
| CI/CD | GitHub Actions + dorny/test-reporter |

## 프로젝트 구조

```
├── backend/                # Flask API + Socket.IO 서버
│   ├── app.py              # 메인 앱 + 소켓 이벤트 (전투, 이동, 채팅)
│   ├── config.py           # 환경변수 기반 설정
│   ├── models.py           # SQLAlchemy 모델 (User, Character, Monster, Item 등)
│   ├── auth.py             # 인증 (회원가입/로그인)
│   ├── characters.py       # 캐릭터 CRUD + 경험치/레벨업
│   ├── monsters.py         # 몬스터 조회 API
│   ├── items.py            # 아이템 관리
│   ├── shop.py             # 상점 구매/판매
│   ├── maps.py             # 맵 CRUD
│   ├── npcs.py             # NPC 조회
│   ├── conftest.py         # pytest 픽스처
│   └── tests/              # 테스트 (auth, characters, items, maps, models, monsters, npcs, shop, users)
├── frontend/               # React + Phaser 클라이언트
│   ├── src/
│   │   ├── MyScene.tsx     # Phaser 게임 씬 (전투, 이동, NPC 상호작용)
│   │   ├── PhaserGame.tsx  # Phaser + React 통합 (UI, 채팅, 상점)
│   │   ├── utils/          # API 유틸리티 (character, items, map, npc, sfx)
│   │   ├── pages/          # 페이지 컴포넌트 (로그인, 캐릭터 선택 등)
│   │   └── admin/          # 관리자 페이지
│   └── public/             # 정적 에셋 (스프라이트, 타일맵)
├── docker-compose.yml      # PostgreSQL + Redis + Backend + Frontend
└── .github/workflows/
    └── test.yml            # CI: pytest + vitest + 테스트 리포트
```

## 로컬 개발 환경 설정

### 사전 요구사항

- Docker & Docker Compose
- (선택) Node.js 20+, Python 3.11+ (Docker 없이 직접 실행 시)

### Docker로 실행

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 SECRET_KEY 등 값을 수정

# 2. 컨테이너 실행
docker-compose up -d

# 3. 브라우저에서 접속
open http://localhost:5173
```

### 직접 실행 (Docker 없이)

```bash
# Backend
cd backend
pip install -r requirements.txt
export SECRET_KEY=my-dev-secret
export DATABASE_URI=postgresql://user:pass@localhost:5432/my_database
python app.py

# Frontend (별도 터미널)
cd frontend
npm install
npm run dev
```

## 테스트 실행

```bash
# Backend (64+ tests)
cd backend
pip install -r requirements-dev.txt
pytest -v

# Frontend (19+ tests)
cd frontend
npm install
npm test            # vitest 실행
npx tsc --noEmit    # TypeScript 타입 체크
```

## CI/CD

GitHub Actions가 push 및 PR 시 자동으로 테스트를 실행합니다.

- **Backend job**: Python 3.11에서 pytest 실행, JUnit XML 리포트 생성
- **Frontend job**: Node.js 20에서 vitest + TypeScript 타입 체크 실행
- **Report job**: dorny/test-reporter로 PR에 테스트 결과 표시

워크플로우 설정: [`.github/workflows/test.yml`](.github/workflows/test.yml)
