#!/bin/bash

# Test script for POST /orders endpoint
# Usage: ./scripts/test-order.sh [product-id-1] [product-id-2] ...

set -e

API_URL="${API_URL:-http://localhost:3000}"
PORT="${PORT:-3000}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing POST /orders Endpoint ===${NC}\n"

# If product IDs are provided as arguments, use them
if [ $# -gt 0 ]; then
  PRODUCT_IDS=("$@")
  echo -e "${YELLOW}Using provided product IDs:${NC} ${PRODUCT_IDS[*]}"
else
  echo -e "${YELLOW}No product IDs provided.${NC}"
  echo -e "${YELLOW}Please provide product IDs as arguments or set them in the script.${NC}"
  echo -e "${YELLOW}Example: ./scripts/test-order.sh <product-id-1> <product-id-2>${NC}\n"
  exit 1
fi

# Build items array
ITEMS="["
for i in "${!PRODUCT_IDS[@]}"; do
  if [ $i -gt 0 ]; then
    ITEMS+=","
  fi
  ITEMS+="{\"productId\":\"${PRODUCT_IDS[$i]}\",\"quantity\":$((i + 1))}"
done
ITEMS+="]"

# Create order payload
PAYLOAD=$(cat <<EOF
{
  "customer": {
    "email": "test@example.com"
  },
  "address": "123 Main St, New York, NY 10001",
  "items": $ITEMS
}
EOF
)

echo -e "${BLUE}Request Payload:${NC}"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""

# Make the request
echo -e "${BLUE}Making request to ${API_URL}/orders...${NC}\n"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${API_URL}/orders")

# Split response and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${BLUE}HTTP Status Code:${NC} $HTTP_CODE\n"

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ Order created successfully!${NC}\n"
  echo -e "${BLUE}Response:${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}✗ Request failed${NC}\n"
  echo -e "${BLUE}Error Response:${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
