#!/bin/bash

# Simple test script for POST /orders endpoint
# This script requires product IDs to be provided
# Usage: ./scripts/test-order-simple.sh <product-id-1> <product-id-2> [product-id-3]

set -e

API_URL="${API_URL:-http://localhost:3000}"

# Check if product IDs are provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 <product-id-1> <product-id-2> [product-id-3] ..."
  echo ""
  echo "To get product IDs, run:"
  echo "  pnpm ts-node scripts/test-order.ts"
  exit 1
fi

# Build items array from arguments
ITEMS="["
for i in "$@"; do
  if [ "$ITEMS" != "[" ]; then
    ITEMS+=","
  fi
  ITEMS+="{\"productId\":\"$i\",\"quantity\":1}"
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

echo "Request Payload:"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""

# Make the request and format output
echo "Response:"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${API_URL}/orders" | jq '.' 2>/dev/null || \
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${API_URL}/orders"

echo ""
