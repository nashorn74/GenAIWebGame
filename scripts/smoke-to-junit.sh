#!/usr/bin/env bash
# smoke-test 출력을 JUnit XML로 변환
# Usage: bash smoke-to-junit.sh <smoke-output.txt> <output.xml>
set -euo pipefail

INPUT="${1:?Usage: smoke-to-junit.sh <input.txt> <output.xml>}"
OUTPUT="${2:?Usage: smoke-to-junit.sh <input.txt> <output.xml>}"

mkdir -p "$(dirname "$OUTPUT")"

TESTS=0
FAILURES=0
CASES=""

while IFS= read -r line; do
  # Match indented ✅ or ❌ lines (test results only, not summary)
  if echo "$line" | grep -qE '^\s+[✅❌]'; then
    TESTS=$((TESTS + 1))
    # Extract test name (between emoji and —)
    name=$(echo "$line" | sed -E 's/.*[✅❌] (.*) —.*/\1/' | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')
    detail=$(echo "$line" | sed -E 's/.*— (.*)/\1/' | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')

    if echo "$line" | grep -q '❌'; then
      FAILURES=$((FAILURES + 1))
      CASES="$CASES    <testcase name=\"$name\" classname=\"smoke-test\"><failure message=\"$detail\"/></testcase>\n"
    else
      CASES="$CASES    <testcase name=\"$name\" classname=\"smoke-test\"/>\n"
    fi
  fi
done < "$INPUT"

cat > "$OUTPUT" <<XMLEOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Integration Smoke Tests" tests="$TESTS" failures="$FAILURES">
$(echo -e "$CASES")  </testsuite>
</testsuites>
XMLEOF

echo "Generated $OUTPUT: $TESTS tests, $FAILURES failures"
