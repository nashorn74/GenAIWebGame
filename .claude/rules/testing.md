---
paths:
  - "**/test*"
  - "**/tests/**"
  - "**/__tests__/**"
---

# 테스트 규칙

## 공통 원칙
- 테스트 삭제 금지, assertion 약화 금지 — 실패 시 소스 코드를 수정
- 커버리지 목표: 백엔드 74%+, 프론트엔드 85%+
- 성공/실패 양쪽 경로 모두 테스트

## Backend (pytest)
- 픽스처: `conftest.py`의 `client` (Flask test_client), `session` (DB 세션)
- DB: SQLite in-memory — 테스트 간 자동 초기화
- 유저 생성 헬퍼: `_register(client, username, password)` 패턴 활용
- 테스트 파일: `backend/tests/test_<module>.py`
- 전제조건: Python 3.11 + `pip install -r requirements-dev.txt`
- 실행: `cd backend && python3 -m pytest -v --tb=short`

## Frontend (vitest)
- API 모킹: `vi.stubGlobal('fetch', vi.fn())` 패턴
- 라우터: `MemoryRouter` 래핑 필수
- DOM 테스트: `@testing-library/react` + `@testing-library/user-event`
- 정리: `afterEach`에서 `vi.restoreAllMocks()`, 필요 시 `vi.resetModules()`
- HTMLMediaElement: `setupTests.ts`에서 play/pause 폴리필 등록됨
- 테스트 파일: `src/**/__tests__/*.test.tsx`
- 실행: `cd frontend && npx vitest run`

## 통합 테스트 (Docker)
- `scripts/integration-test.sh`: 핵심 유저 플로우 E2E
- `scripts/smoke-test.sh`: 엔드포인트 헬스체크
- Docker Compose CI 환경 필요 (`docker-compose.ci.yml`)
- `assert_status` + `json_field` 헬퍼 패턴
- `require_id` 가드: 핵심 ID 추출 실패 시 즉시 중단
