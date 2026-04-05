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
check_body "GET /           → Flask"   "$BASE/api/maps"    "map_key"

echo ""
echo "── Auth (via nginx proxy) ──"
check "POST /auth/login → 400 (no body)" "$BASE/auth/login" "400"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Smoke tests FAILED"
  exit 1
fi
echo "✅ All smoke tests passed"
