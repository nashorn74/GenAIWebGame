---
paths:
  - "backend/**/*.py"
---

# Backend 규칙 (Flask + SQLAlchemy)

## Blueprint 패턴
- 도메인별 Blueprint 분리 (auth_bp, characters_bp, items_bp 등)
- url_prefix: `/auth` (인증), `/api` (나머지 전부)
- **새 Blueprint 추가 시 `app.py`와 `conftest.py` 양쪽에 등록 필수**

## 라우트 핸들러
- JSON 파싱: `data = request.get_json() or {}`
- 필수 필드 검증 후 적절한 HTTP 상태 코드 반환 (400/401/404)
- 모든 쿼리는 SQLAlchemy ORM 사용 (raw SQL 금지)
- `get_or_404()` 활용하여 존재하지 않는 리소스 처리

## 모델 규칙
- 모든 모델에 `to_dict()` 메서드 구현
- 관계는 `db.relationship()` 사용, `lazy=True` 기본
- FK 제약 주의: 삭제 시 관련 레코드 먼저 정리 (예: CharacterItem → Character)

## eventlet 호환
- blocking I/O 주의 (`time.sleep` 대신 `eventlet.sleep`)
- Socket.IO 이벤트는 `app.py`에서 관리

## conftest.py
- `app` 픽스처: SQLite in-memory, 모든 Blueprint 등록
- `client` 픽스처: `app.test_client()`
- `session` 픽스처: DB 세션 직접 사용
