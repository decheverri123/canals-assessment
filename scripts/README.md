# Test Scripts for POST /orders Endpoint

This directory contains scripts to test the POST /orders endpoint with formatted, readable output.

## Available Scripts

### 1. `test-order.ts` (Recommended)

A TypeScript script that:
- Fetches products from the database automatically
- Creates a test order with the first few products
- Displays formatted, human-readable output
- Handles errors gracefully

**Usage:**
```bash
# Basic usage (uses default email and address)
pnpm test:order

# Or directly:
pnpm ts-node scripts/test-order.ts

# With custom email and address:
pnpm ts-node scripts/test-order.ts --email customer@example.com --address "456 Oak Ave, Los Angeles, CA 90001"
```

**Output includes:**
- List of available products
- Order details (ID, customer, shipping address, total)
- Formatted order items with prices
- Status and creation timestamp

### 2. `test-order.sh`

A bash script that uses `curl` and `jq` for JSON formatting.

**Usage:**
```bash
./scripts/test-order.sh <product-id-1> <product-id-2> [product-id-3] ...
```

**Example:**
```bash
./scripts/test-order.sh abc-123 def-456 ghi-789
```

**Requirements:**
- `curl` (usually pre-installed)
- `jq` (for JSON formatting): `brew install jq` on macOS

### 3. `test-order-simple.sh`

A simpler bash script without color output, useful for automation.

**Usage:**
```bash
./scripts/test-order-simple.sh <product-id-1> <product-id-2> [product-id-3] ...
```

## Getting Product IDs

To get product IDs for use with the shell scripts:

1. **Using Prisma Studio:**
   ```bash
   pnpm prisma:studio
   ```
   Navigate to the Products table to see product IDs.

2. **Using the TypeScript script:**
   ```bash
   pnpm test:order
   ```
   The script will display product IDs in its output.

3. **Using a database query:**
   ```bash
   pnpm prisma studio
   ```
   Or connect to your database and run:
   ```sql
   SELECT id, sku, name FROM products;
   ```

## Example Output

The TypeScript script (`test-order.ts`) produces output like:

```
============================================================
ORDER CREATED SUCCESSFULLY
============================================================
Order ID:        abc-123-def-456
Customer Email:  test@example.com
Shipping To:     123 Main St, New York, NY 10001
Total Amount:    $1,429.97
Status:          PAID
Created At:      12/15/2024, 3:45:30 PM

Order Items:
------------------------------------------------------------
1. Product ID: prod-001
   Quantity: 1 × $1,299.99 = $1,299.99
2. Product ID: prod-002
   Quantity: 2 × $29.99 = $59.98
3. Product ID: prod-003
   Quantity: 3 × $89.99 = $269.97
------------------------------------------------------------
Total: $1,429.97
============================================================
```

## Environment Variables

You can customize the API URL:

```bash
# For shell scripts
export API_URL=http://localhost:3000
./scripts/test-order.sh <product-ids>

# For TypeScript script
API_URL=http://localhost:3000 pnpm test:order
```

## Prerequisites

1. **Server must be running:**
   ```bash
   pnpm dev
   ```

2. **Database must be seeded:**
   ```bash
   pnpm prisma db seed
   ```

3. **For shell scripts, install jq (optional but recommended):**
   ```bash
   brew install jq  # macOS
   # or
   apt-get install jq  # Linux
   ```

## Testing Different Scenarios

### Test with payment failure (amount = 9999 cents)
Create an order that totals exactly $99.99 to trigger payment failure.

### Test warehouse selection
Create orders with different shipping addresses to see which warehouse is selected.

### Test inventory validation
Try ordering more items than available to test error handling.
