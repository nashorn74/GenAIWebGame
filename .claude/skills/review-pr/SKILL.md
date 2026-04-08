---
name: review-pr
description: Review a PR with project-specific checklist
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
argument-hint: "[PR number]"
---

# /review-pr — PR 코드 리뷰

PR 변경사항을 Arkacia 프로젝트 체크리스트에 따라 리뷰한다.

## 실행

`$ARGUMENTS`가 있으면 해당 PR 번호, 없으면 현재 브랜치의 PR을 리뷰.

### 1. PR 변경사항 확인

```bash
# PR 번호가 주어진 경우
gh pr diff $ARGUMENTS

# 현재 브랜치 PR
gh pr diff
```

변경된 파일 목록을 파악하고, 각 파일을 읽어서 리뷰한다.

### 2. 체크리스트

#### Backend (변경된 파일이 backend/**/*.py인 경우)
- [ ] 새 Blueprint 추가 시 `app.py` + `conftest.py` 양쪽 등록?
- [ ] API 입력 검증: `get_json() or {}` 후 필수 필드 체크?
- [ ] 에러 핸들링: 적절한 HTTP 상태 코드 (400/401/404)?
- [ ] SQLAlchemy ORM 사용 (raw SQL 금지)?
- [ ] FK 제약: 삭제 시 관련 레코드 처리?

#### Frontend (변경된 파일이 frontend/src/**인 경우)
- [ ] TypeScript strict: `any` 남용 없음?
- [ ] API 호출: `VITE_API_BASE_URL` 패턴 사용?
- [ ] admin API: `!res.ok` 체크 + `encodeURIComponent`?
- [ ] 새 컴포넌트에 테스트 추가?

#### Docker / CI (변경된 파일이 docker-compose* 또는 .github/**인 경우)
- [ ] docker-compose.yml / prod / ci 간 설정 동기화?
- [ ] `.dockerignore` 업데이트 필요?
- [ ] 새 환경변수 추가 시 `.env.example` 업데이트?

#### 공통
- [ ] 한국어 주석 유지?
- [ ] 하드코딩된 시크릿/URL 없음?
- [ ] 테스트 추가 또는 기존 테스트 수정됨?
- [ ] 커버리지 하락 없음? (백엔드 74%+, 프론트엔드 85%+)

### 3. 리뷰 결과 출력

발견사항을 심각도별로 분류:

- **CRITICAL**: 반드시 수정 (보안, 데이터 손실)
- **WARNING**: 강하게 권장 (버그 가능성, 패턴 위반)
- **SUGGESTION**: 선택적 (코드 품질, 가독성)

각 항목에 파일:라인 참조와 근거 포함.
