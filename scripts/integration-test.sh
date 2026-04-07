#!/usr/bin/env bash
# CI 통합 테스트 — Docker Compose 환경에서 핵심 유저 플로우 검증
# 회원가입 → 로그인 → 캐릭터 생성 → 맵 이동 → 상점 거래 → 아이템 사용 → 캐릭터 삭제
set -euo pipefail

BASE="http://localhost:8080"
PASS=0
FAIL=0
TOTAL=0

# ── 유틸리티 ──

assert_status() {
  local desc="$1" method="$2" url="$3" expect="$4"
  shift 4
  local status body tmpfile
  TOTAL=$((TOTAL + 1))
  tmpfile=$(mktemp)
  status=$(curl -s -o "$tmpfile" -w "%{http_code}" -X "$method" -H "Content-Type: application/json" "$@" "$url" 2>/dev/null || echo "000")
  body=$(cat "$tmpfile")
  rm -f "$tmpfile"
  if [ "$status" = "$expect" ]; then
    echo "  ✅ $desc — HTTP $status"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — HTTP $status (expected $expect)"
    echo "     Response: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
  # 마지막 응답을 LAST_BODY에 저장 (후속 단계에서 사용)
  LAST_BODY="$body"
}

assert_value() {
  local desc="$1" actual="$2" expected="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $desc — $actual"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — got $actual (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

json_field() {
  # 간단한 JSON 필드 추출 (jq 없는 환경 대비)
  local field="$1"
  echo "$LAST_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)$field)" 2>/dev/null || echo "PARSE_ERROR"
}

require_id() {
  local name="$1" value="$2"
  if [ "$value" = "PARSE_ERROR" ] || [ -z "$value" ]; then
    echo "  FATAL: $name 추출 실패, 테스트 중단"
    exit 1
  fi
}

echo "=== Integration Tests — User Flow ==="

# ──────────────────────────────────────────
echo ""
echo "── 1. 회원가입 & 로그인 ──"

assert_status "POST /auth/register → 201" \
  POST "$BASE/auth/register" "201" \
  -d '{"username":"inttest1","password":"abcd1234","password_confirm":"abcd1234"}'

USER_ID=$(json_field "['user']['id']")
require_id "USER_ID" "$USER_ID"
echo "     → user_id=$USER_ID"

assert_status "POST /auth/register duplicate → 400" \
  POST "$BASE/auth/register" "400" \
  -d '{"username":"inttest1","password":"abcd1234","password_confirm":"abcd1234"}'

assert_status "POST /auth/login → 200" \
  POST "$BASE/auth/login" "200" \
  -d '{"username":"inttest1","password":"abcd1234"}'

LOGIN_USER_ID=$(json_field "['user']['id']")
echo "     → login user_id=$LOGIN_USER_ID"

assert_status "POST /auth/login wrong password → 401" \
  POST "$BASE/auth/login" "401" \
  -d '{"username":"inttest1","password":"wrongpass1"}'

# ──────────────────────────────────────────
echo ""
echo "── 2. 캐릭터 CRUD ──"

assert_status "POST /api/characters (warrior) → 201" \
  POST "$BASE/api/characters" "201" \
  -d "{\"user_id\":$USER_ID,\"name\":\"IntHero\",\"job\":\"warrior\"}"

CHAR_ID=$(json_field "['character']['id']")
require_id "CHAR_ID" "$CHAR_ID"
echo "     → char_id=$CHAR_ID"

assert_status "GET /api/characters?user_id → 200" \
  GET "$BASE/api/characters?user_id=$USER_ID" "200"

CHAR_COUNT=$(echo "$LAST_BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "     → character count=$CHAR_COUNT"

assert_status "GET /api/characters/:id → 200" \
  GET "$BASE/api/characters/$CHAR_ID" "200"

CHAR_HP=$(json_field "['hp']")
CHAR_MAX_HP=$(json_field "['max_hp']")
CHAR_GOLD=$(json_field "['gold']")
echo "     → hp=$CHAR_HP/$CHAR_MAX_HP gold=$CHAR_GOLD"

assert_status "PUT /api/characters/:id (rename) → 200" \
  PUT "$BASE/api/characters/$CHAR_ID" "200" \
  -d '{"name":"IntHeroNew"}'

CHAR_NAME=$(json_field "['character']['name']")
echo "     → renamed to $CHAR_NAME"

# ──────────────────────────────────────────
echo ""
echo "── 3. 경험치 & 레벨업 ──"

assert_status "PATCH /api/characters/:id/gain_exp → 200" \
  PATCH "$BASE/api/characters/$CHAR_ID/gain_exp" "200" \
  -d '{"amount":100}'

CHAR_LEVEL=$(json_field "['character']['level']")
echo "     → level=$CHAR_LEVEL after +100 exp"

# ──────────────────────────────────────────
echo ""
echo "── 4. 맵 이동 ──"

# 먼저 맵 목록 확인
assert_status "GET /api/maps → 200" \
  GET "$BASE/api/maps" "200"

MAP_COUNT=$(echo "$LAST_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)")
echo "     → $MAP_COUNT maps available"

assert_status "PATCH /api/characters/:id/move → 200" \
  PATCH "$BASE/api/characters/$CHAR_ID/move" "200" \
  -d '{"map_key":"city2","x":640,"y":768}'

CHAR_MAP=$(json_field "['character']['map_key']")
echo "     → moved to map=$CHAR_MAP"

# ──────────────────────────────────────────
echo ""
echo "── 5. 아이템 & 상점 거래 ──"

# 5-1. 아이템 생성 (테스트 데이터, 기본 골드=100 이내 가격)
assert_status "POST /api/items (potion) → 201" \
  POST "$BASE/api/items" "201" \
  -d '{"name":"TestPotion","category":"potion","effect_value":30,"buy_price":10,"sell_price":5}'

POTION_ID=$(json_field "['item']['id']")
require_id "POTION_ID" "$POTION_ID"
echo "     → potion item_id=$POTION_ID"

assert_status "POST /api/items (weapon) → 201" \
  POST "$BASE/api/items" "201" \
  -d '{"name":"TestSword","category":"weapon","attack_power":10,"buy_price":200,"sell_price":100}'

WEAPON_ID=$(json_field "['item']['id']")
require_id "WEAPON_ID" "$WEAPON_ID"
echo "     → weapon item_id=$WEAPON_ID"

# 5-2. NPC 생성 (shop 타입)
assert_status "POST /api/npcs (shop) → 201" \
  POST "$BASE/api/npcs" "201" \
  -d '{"name":"TestMerchant","npc_type":"shop","map_key":"city2","x":100,"y":100,"dialog":"Buy!","gender":"male","race":"human","job":"merchant"}'

NPC_ID=$(json_field "['npc']['id']")
require_id "NPC_ID" "$NPC_ID"
echo "     → shop npc_id=$NPC_ID"

# 5-3. 상점 구매 (기본 골드=100, 포션 10G × 3 = 30G)
assert_status "POST /api/shops/:npc/buy → 200" \
  POST "$BASE/api/shops/$NPC_ID/buy" "200" \
  -d "{\"character_id\":$CHAR_ID,\"item_id\":$POTION_ID,\"quantity\":3}"

BUY_GOLD=$(json_field "['character_gold']")
echo "     → bought 3 potions, gold=$BUY_GOLD"
assert_value "gold after buying 3 potions (100 - 30)" "$BUY_GOLD" "70"

# 5-4. 상점 판매
assert_status "POST /api/shops/:npc/sell → 200" \
  POST "$BASE/api/shops/$NPC_ID/sell" "200" \
  -d "{\"character_id\":$CHAR_ID,\"item_id\":$POTION_ID,\"quantity\":1}"

SELL_GOLD=$(json_field "['character_gold']")
echo "     → sold 1 potion, gold=$SELL_GOLD"
assert_value "gold after selling 1 potion (70 + 5)" "$SELL_GOLD" "75"

# 5-5. 골드 부족 구매 실패 (무기 200G, 잔여 골드 < 200)
assert_status "POST /api/shops/:npc/buy (not enough gold) → 400" \
  POST "$BASE/api/shops/$NPC_ID/buy" "400" \
  -d "{\"character_id\":$CHAR_ID,\"item_id\":$WEAPON_ID,\"quantity\":1}"

# ──────────────────────────────────────────
echo ""
echo "── 6. 아이템 사용 (포션) ──"

# HP를 낮추고 포션 사용
assert_status "PATCH /api/characters/:id/stats (lower HP) → 200" \
  PATCH "$BASE/api/characters/$CHAR_ID/stats" "200" \
  -d '{"hp":50}'

assert_status "POST /api/items/use (potion) → 200" \
  POST "$BASE/api/items/use" "200" \
  -d "{\"character_id\":$CHAR_ID,\"item_id\":$POTION_ID,\"quantity\":1}"

HEALED=$(json_field "['healed']")
AFTER_HP=$(json_field "['hp']")
echo "     → healed=$HEALED, hp=$AFTER_HP"
assert_value "healed by potion (30)" "$HEALED" "30"
assert_value "hp after use (50+30=80)" "$AFTER_HP" "80"

# ──────────────────────────────────────────
echo ""
echo "── 7. NPC 대화 ──"

assert_status "GET /api/npcs/:id/dialog → 200" \
  GET "$BASE/api/npcs/$NPC_ID/dialog" "200"

DIALOG=$(json_field "['dialog']")
echo "     → dialog=$DIALOG"

# ──────────────────────────────────────────
echo ""
echo "── 8. 정리 (Cleanup) ──"

# 캐릭터에 남은 아이템 판매 (FK constraint 방지: 구매3 - 판매1 - 사용1 = 1개 남음)
assert_status "POST /api/shops/:npc/sell (cleanup remaining) → 200" \
  POST "$BASE/api/shops/$NPC_ID/sell" "200" \
  -d "{\"character_id\":$CHAR_ID,\"item_id\":$POTION_ID,\"quantity\":1}"

assert_status "DELETE /api/characters/:id → 200" \
  DELETE "$BASE/api/characters/$CHAR_ID" "200"

assert_status "GET /api/characters/:id (deleted) → 404" \
  GET "$BASE/api/characters/$CHAR_ID" "404"

assert_status "DELETE /api/items/:id (potion) → 200" \
  DELETE "$BASE/api/items/$POTION_ID" "200"

assert_status "DELETE /api/items/:id (weapon) → 200" \
  DELETE "$BASE/api/items/$WEAPON_ID" "200"

assert_status "DELETE /api/npcs/:id → 200" \
  DELETE "$BASE/api/npcs/$NPC_ID" "200"

assert_status "DELETE /api/users/:id → 200" \
  DELETE "$BASE/api/users/$USER_ID" "200"

# ──────────────────────────────────────────
echo ""
echo "=== Integration Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Integration tests FAILED"
  exit 1
fi
echo "✅ All integration tests passed"
