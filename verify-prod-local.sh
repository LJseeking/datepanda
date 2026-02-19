#!/bin/bash
# Source .env to get secrets without printing them
set -a
source .env
set +a

BASE_URL="http://localhost:3000"

echo "=== 1. Cron THU ==="
curl -s -X POST "$BASE_URL/api/cron/matching/thu" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -w "\nHTTP Code: %{http_code}\n"

echo -e "\n=== 2. Cron FRI ==="
curl -s -X POST "$BASE_URL/api/cron/matching/fri" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -w "\nHTTP Code: %{http_code}\n"

echo -e "\n=== 3. Debug State ==="
curl -s "$BASE_URL/api/debug/matching/state" \
  -H "x-admin-token: $MATCH_ADMIN_TOKEN" \
  -w "\nHTTP Code: %{http_code}\n"
