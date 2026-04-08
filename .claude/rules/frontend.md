---
paths:
  - "frontend/src/**"
---

# Frontend 규칙 (React + TypeScript + Phaser)

## 컴포넌트 구조
- 페이지: `src/pages/` (LoginPage, CharacterSelect, CharacterDialog)
- UI: `src/ui/` (InventoryDialog, ShopDialog, NpcDialog, MenuPopover)
- 관리자: `src/admin/pages/` (AdminUsers, AdminItems, AdminMaps, AdminNPCs 등)
- 게임: `MyScene.tsx` (Phaser 로직), `PhaserGame.tsx` (React 브릿지)

## API 호출 패턴
- `fetch(\`${import.meta.env.VITE_API_BASE_URL}/api/...\`)` 사용
- admin 페이지: `admin/api.ts`의 공용 함수 사용 (fetchUsers, fetchItems 등)
- 응답 에러 체크: `if (!res.ok) throw new Error(...)` 필수

## 인증
- `sessionStorage`에 userId, charId 저장
- `App.tsx`의 `getUserId()`, `getCharId()` 헬퍼 사용
- admin: 별도 세션 인증 (`PrivateRoute` 래퍼)

## 테스트 파일 위치
- 소스 파일과 같은 디렉토리의 `__tests__/` 하위에 배치
- 예: `src/pages/__tests__/LoginPage.test.tsx`

## MUI 사용
- `@mui/material` 에서 컴포넌트 import
- Dialog, TextField, Button, Table 등 MUI 컴포넌트 활용
- `@mui/icons-material` 에서 아이콘 import

## Phaser 통합
- Phaser 씬 로직은 `MyScene.tsx`에 집중
- React UI 오버레이는 `PhaserGame.tsx`에서 관리
- Phaser ↔ React 데이터 교환: 이벤트 기반
