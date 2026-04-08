#!/usr/bin/env bash
# CI 스모크 테스트 — 빌드된 Docker 이미지가 정상 동작하는지 검증
set -euo pipefail

BASE="http://localhost:8080"
PASS=0
FAIL=0

check() {
  local desc="$1" url="$2" expect="$3"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
  if [ "$status" = "$expect" ]; then
    echo "  ✅ $desc — HTTP $status"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — HTTP $status (expected $expect)"
    FAIL=$((FAIL + 1))
  fi
}

check_post() {
  local desc="$1" url="$2" expect="$3"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" "$url" || echo "000")
  if [ "$status" = "$expect" ]; then
    echo "  ✅ $desc — HTTP $status"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — HTTP $status (expected $expect)"
    FAIL=$((FAIL + 1))
  fi
}

check_body() {
  local desc="$1" url="$2" needle="$3"
  local body
  body=$(curl -sf "$url" || echo "")
  if echo "$body" | grep -q "$needle"; then
    echo "  ✅ $desc — contains '$needle'"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — missing '$needle'"
    FAIL=$((FAIL + 1))
  fi
}

check_body_absent() {
  local desc="$1" url="$2" bad_pattern="$3"
  local body
  body=$(curl -sf "$url" || echo "")
  if echo "$body" | grep -qE "$bad_pattern"; then
    echo "  ❌ $desc — found forbidden pattern '$bad_pattern'"
    FAIL=$((FAIL + 1))
  else
    echo "  ✅ $desc — no forbidden pattern"
    PASS=$((PASS + 1))
  fi
}

echo "=== Smoke Tests ==="

echo ""
echo "── Frontend (nginx) ──"
check "GET /           → SPA index"    "$BASE/"            "200"
check "GET /nonexist   → SPA fallback" "$BASE/nonexist"    "200"

echo ""
echo "── Backend API (via nginx proxy) ──"
check      "GET /api/maps   → 200"     "$BASE/api/maps"    "200"
check      "GET /api/items  → 200"     "$BASE/api/items"   "200"
check      "GET /api/npcs   → 200"     "$BASE/api/npcs"    "200"
check_body "GET /api/maps   → JSON"    "$BASE/api/maps"    "\["

echo ""
echo "── Auth (via nginx proxy) ──"
check_post "POST /auth/login → 400 (no body)" "$BASE/auth/login" "400"

echo ""
echo "── Frontend Build Integrity ──"

# SPA가 실제 React 앱인지 (빈 페이지가 아닌지)
check_body "GET / → has <div id=\"root\">"  "$BASE/" '<div id="root">'

# JS 번들이 정상 로드되는지 (index.html에 있는 script 태그의 src 추출 후 확인)
JS_PATH=$(curl -sf "$BASE/" | grep -oE '/assets/index-[a-zA-Z0-9]+\.js' | head -1)
if [ -n "$JS_PATH" ]; then
  check "GET $JS_PATH → JS bundle loads" "$BASE$JS_PATH" "200"

  # 빌드된 JS에 "undefined/api" 패턴이 없는지 (VITE_API_BASE_URL 미설정 버그 감지)
  check_body_absent "JS bundle has no 'undefined/api' URL bug" "$BASE$JS_PATH" 'undefined/api|undefined/auth'

  # 빌드된 JS에 localhost:5173 하드코딩이 없는지 (dev URL 누출 감지)
  check_body_absent "JS bundle has no localhost:5173 leak" "$BASE$JS_PATH" 'localhost:5173'
else
  echo "  ⚠️  JS bundle path not found in index.html — skipping JS checks"
  FAIL=$((FAIL + 1))
fi

# CSS 번들 로드 확인
CSS_PATH=$(curl -sf "$BASE/" | grep -oE '/assets/index-[a-zA-Z0-9]+\.css' | head -1)
if [ -n "$CSS_PATH" ]; then
  check "GET $CSS_PATH → CSS bundle loads" "$BASE$CSS_PATH" "200"
else
  echo "  ⚠️  CSS bundle path not found — skipping"
fi

echo ""
echo "── Frontend↔Backend E2E (via nginx) ──"

# 프론트엔드 nginx 경유로 회원가입 → 로그인 전체 플로우 (프록시 정상 동작 확인)
COOKIE_JAR_SMOKE=$(mktemp)
trap "rm -f $COOKIE_JAR_SMOKE" EXIT

REG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -c "$COOKIE_JAR_SMOKE" -b "$COOKIE_JAR_SMOKE" \
  -d '{"username":"smokeuser","password":"abcd1234","password_confirm":"abcd1234"}' \
  "$BASE/auth/register" 2>/dev/null || echo "000")
if [ "$REG_STATUS" = "201" ]; then
  echo "  ✅ POST /auth/register via nginx → HTTP $REG_STATUS"
  PASS=$((PASS + 1))
else
  echo "  ❌ POST /auth/register via nginx → HTTP $REG_STATUS (expected 201)"
  FAIL=$((FAIL + 1))
fi

LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -c "$COOKIE_JAR_SMOKE" -b "$COOKIE_JAR_SMOKE" \
  -d '{"username":"smokeuser","password":"abcd1234"}' \
  "$BASE/auth/login" 2>/dev/null || echo "000")
if [ "$LOGIN_STATUS" = "200" ]; then
  echo "  ✅ POST /auth/login via nginx → HTTP $LOGIN_STATUS"
  PASS=$((PASS + 1))
else
  echo "  ❌ POST /auth/login via nginx → HTTP $LOGIN_STATUS (expected 200)"
  FAIL=$((FAIL + 1))
fi

# SPA 라우트가 index.html로 fallback 되는지 (React Router 경로)
check "GET /login       → SPA route"      "$BASE/login"      "200"
check "GET /characters  → SPA route"      "$BASE/characters" "200"
check "GET /admin       → SPA route"      "$BASE/admin"      "200"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Smoke tests FAILED"
  exit 1
fi
echo "✅ All smoke tests passed"
