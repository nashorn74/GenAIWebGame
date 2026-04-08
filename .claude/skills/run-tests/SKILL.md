---
name: run-tests
description: Run backend and frontend test suites with coverage
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
---

# /run-tests — 전체 테스트 실행

백엔드와 프론트엔드 테스트를 순차 실행하고 결과를 요약한다.

## 실행 순서

### 1. 백엔드 테스트 (pytest)

```bash
cd backend && python3 -m pytest -v --tb=short --cov --cov-report=term-missing
```

- 커버리지 목표: 74%+
- 실패 시 실패한 테스트 목록과 에러 메시지 정리

### 2. 프론트엔드 테스트 (vitest)

```bash
cd frontend && npx vitest run --coverage
```

- 커버리지 목표: 86%+
- 실패 시 실패한 테스트 목록과 에러 메시지 정리

### 3. 결과 요약

아래 형식으로 보고:

```
=== Test Results ===
Backend:  XX passed, XX failed (coverage: XX%)
Frontend: XX passed, XX failed (coverage: XX%)
```

- 모두 통과 시: 커버리지 수치 포함 요약
- 실패 시: 실패 테스트별 원인 분석 + 수정 제안
