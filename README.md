# Canals Backend Assessment

Order Management System with Express, Prisma, and PostgreSQL.

## Prerequisites

- Node.js (LTS version)
- pnpm
- Docker and Docker Compose

## Quick Start (Single Command)

**For interviewers and quick setup:**

```bash
docker-compose up
```

That's it! The setup will automatically:
- Start PostgreSQL database
- Wait for database to be ready
- Run database migrations (or push schema if no migrations exist)
- Seed the database with initial data
- Start the application server

The API will be available at `http://localhost:3000`

**To run in detached mode:**
```bash
docker-compose up -d
```

**To view logs:**
```bash
docker-compose logs -f app
```

## Setup Instructions

### Option 1: Run Everything with Docker (Recommended)

The Docker setup now handles everything automatically. Just run:

```bash
docker-compose up
```

The entrypoint script will:
1. Wait for the database to be ready
2. Deploy migrations (or push schema if migrations don't exist)
3. Seed the database with initial test data
4. Start the application

**Manual steps (if needed):**

If you need to manually run migrations or seed:

```bash
# Run migrations manually
docker-compose exec app pnpm prisma migrate deploy

# Seed database manually
docker-compose exec app pnpm prisma:seed
```

### Option 2: Run PostgreSQL in Docker, App Locally

1. **Start only PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Create `.env` file:**
   ```bash
   DATABASE_URL=postgresql://canals_user:canals_password@localhost:5432/canals_db
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Generate Prisma client:**
   ```bash
   pnpm prisma:generate
   ```

5. **Run migrations:**
   ```bash
   pnpm prisma:migrate
   ```

6. **Seed the database:**
   ```bash
   pnpm prisma:seed
   ```

7. **Start the development server:**
   ```bash
   pnpm dev
   ```

## Docker Commands

- **Start services:** `docker-compose up -d`
- **Stop services:** `docker-compose down`
- **View logs:** `docker-compose logs -f`
- **Rebuild app:** `docker-compose build app`
- **Access app container:** `docker-compose exec app sh`
- **Access PostgreSQL:** `docker-compose exec postgres psql -U canals_user -d canals_db`

## API Endpoints

### GET /products

Get all available products.

**Response:**
```json
[
  {
    "id": "product-uuid",
    "sku": "PROD-001",
    "name": "Laptop Computer",
    "price": 129999
  }
]
```

### POST /orders

Create a new order.

**Request:**
```json
{
  "customer": {
    "email": "customer@example.com"
  },
  "address": "123 Main St, New York, NY 10001",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "id": "order-uuid",
  "customerEmail": "customer@example.com",
  "shippingAddress": "123 Main St, New York, NY 10001",
  "totalAmount": 5000,
  "status": "PAID",
  "orderItems": [...]
}
```

## Testing

This project includes focused tests for the core business logic and critical flows. While comprehensive testing wasn't required for this assessment, I've included tests that were essential to my development process:

### What's Tested

**Integration Tests (11 tests):**
- Order creation happy path (end-to-end)
- Multi-item orders
- Payment failure handling
- Insufficient inventory scenarios
- Warehouse selection with multiple locations

**Unit Tests (8 tests):**
- Warehouse selection algorithm (the most complex business logic)
- Distance calculation (Haversine formula)

### Why These Tests

These tests helped me during development to:
1. Verify the warehouse selection algorithm works correctly
2. Ensure transaction handling prevents race conditions
3. Validate payment failure doesn't create orphaned orders
4. Confirm inventory deduction happens atomically

The tests cover the **business-critical paths** and **edge cases that could cause production issues**, rather than testing framework behavior or validation logic.

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage
```

**Test Coverage:** ~85% of business logic, focused on correctness over completeness.

### Using Command Line Scripts

See `scripts/README.md` for detailed information about test scripts:

```bash
# TypeScript script (recommended)
pnpm test:order

# Shell script
./scripts/test-order.sh <product-id-1> <product-id-2>
```

### Test Scenarios

- **Payment failure test:** Create an order totaling exactly $99.99 (9999 cents) to trigger payment failure
- **Warehouse selection:** Test with different shipping addresses to see which warehouse is selected
- **Split shipment error:** Try ordering items that exist only in different warehouses
- **Inventory validation:** Order more items than available to test error handling
