---
name: Express Prisma Docker Backend
overview: Build a production-quality Express.js + TypeScript backend with Prisma ORM, PostgreSQL, and Docker. Implement order creation with warehouse selection, geocoding, payment processing, and inventory management using Prisma transactions.
todos:
  - id: "1"
    content: Create project configuration files (package.json, tsconfig.json, .env.example, .gitignore)
    status: pending
  - id: "2"
    content: Set up Prisma schema (prisma/schema.prisma) with prisma 7 and all models and relations
    status: pending
  - id: "3"
    content: Create database utilities (src/db/prisma.ts) with Prisma client singleton
    status: pending
  - id: "4"
    content: Implement distance utility (src/utils/distance.ts) with Haversine formula
    status: pending
  - id: "5"
    content: Create mock services (src/mocks/geocodingMock.ts and paymentMock.ts)
    status: pending
  - id: "6"
    content: Implement service layer (productService.ts, warehouseService.ts, orderService.ts)
    status: pending
  - id: "7"
    content: Create order controller (src/controllers/orderController.ts) with POST /orders endpoint
    status: pending
  - id: "8"
    content: Set up Express app (src/app.ts) with routes and error handling
    status: pending
  - id: "9"
    content: Create server entry point (src/server.ts)
    status: pending
  - id: "10"
    content: Implement Prisma seed script (prisma/seed.ts) with products, warehouses, and inventory
    status: pending
  - id: "11"
    content: Create Dockerfile for Node.js application
    status: pending
  - id: "12"
    content: Create docker-compose.yml with api and postgres services
    status: pending
  - id: "13"
    content: Write comprehensive README.md with setup instructions and design decisions
    status: pending
---

# Express + Prisma + Docker Backend Implementation Plan

## Project Structure

```
canals-assessment/
├── src/
│   ├── controllers/
│   │   └── orderController.ts       # POST /orders endpoint handler
│   ├── services/
│   │   ├── orderService.ts          # Core order creation logic
│   │   ├── warehouseService.ts      # Warehouse selection & inventory checks
│   │   └── productService.ts        # Product price calculations
│   ├── mocks/
│   │   ├── geocodingMock.ts         # Mock geocoding API endpoint
│   │   └── paymentMock.ts           # Mock payment API endpoint
│   ├── utils/
│   │   └── distance.ts              # Haversine distance calculation
│   ├── db/
│   │   └── prisma.ts                 # Prisma client singleton
│   ├── app.ts                        # Express app setup & middleware
│   └── server.ts                     # Server entry point
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── seed.ts                      # Seed data script
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Steps

### 1. Project Configuration Files

**package.json**

- Node.js 18+
- Express, Prisma, TypeScript dependencies
- Build and start scripts
- TypeScript strict mode enabled

**tsconfig.json**

- Strict TypeScript configuration
- Target ES2020+
- Module resolution: node
- Output to `dist/`

**.env.example**

- `DATABASE_URL` for Prisma
- `PORT` (default 3000)
- `NODE_ENV`

**.gitignore**

- node_modules, dist, .env, .prisma

### 2. Prisma Schema (`prisma/schema.prisma`)

Implement the exact schema provided:

- `Product` model with id, name, price
- `Warehouse` model with id, name, latitude, longitude
- `Inventory` model (junction table) with warehouseId, productId, quantity
- `Order` model with customerName, shippingAddress, coordinates, totalAmount
- `OrderItem` model with orderId, productId, quantity, priceAtSale
- Proper relations and unique constraints

### 3. Database Utilities (`src/db/prisma.ts`)

- Singleton Prisma client instance
- Connection pooling configuration
- Graceful shutdown handling

### 4. Distance Utility (`src/utils/distance.ts`)

- Implement Haversine formula exactly as specified
- Function: `calculateDistance(lat1, lon1, lat2, lon2)`
- Returns distance in kilometers

### 5. Mock Services

**`src/mocks/geocodingMock.ts`**

- Express route handler: `GET /mocks/geocode?address=...`
- Deterministic hash-based coordinate generation
- Returns `{ lat, lng }`

**`src/mocks/paymentMock.ts`**

- Express route handler: `POST /mocks/payment`
- Validates cardNumber (length === 16) and amount (> 0)
- Returns `{ success: true, transactionId: "txn_..." }`
- Returns 402 on failure

### 6. Service Layer

**`src/services/productService.ts`**

- `getProductPrices(productIds: string[])` - Fetch product prices from DB
- `calculateTotal(items, prices)` - Calculate order total

**`src/services/warehouseService.ts`**

- `findFulfillableWarehouses(productIds, quantities)` - Find warehouses with sufficient inventory
- `selectNearestWarehouse(warehouses, shippingLat, shippingLng)` - Use Haversine to find closest
- Returns warehouse that can fulfill all items

**`src/services/orderService.ts`**

- `createOrder(orderData)` - Main orchestration:

  1. Validate input
  2. Call geocoding mock
  3. Find fulfillable warehouses
  4. Select nearest warehouse
  5. Calculate total price
  6. Call payment mock (fail on 402)
  7. Prisma transaction:

     - Create Order
     - Create OrderItems
     - Decrement inventory (updateMany with quantity >= required)
     - Rollback if any inventory update affects 0 rows

  1. Return created order

### 7. Controller (`src/controllers/orderController.ts`)

- `POST /orders` handler
- Extract request body
- Call `orderService.createOrder()`
- Handle errors (400, 402, 500)
- Return JSON responses

### 8. Express App (`src/app.ts`)

- Express setup
- JSON body parser
- CORS (if needed)
- Routes:
  - `/mocks/geocode` → geocodingMock
  - `/mocks/payment` → paymentMock
  - `/orders` → orderController
- Error handling middleware (returns `{ error: "message" }`)

### 9. Server Entry (`src/server.ts`)

- Import app from `app.ts`
- Start server on PORT
- Graceful shutdown handling

### 10. Prisma Seed (`prisma/seed.ts`)

- 5 products with realistic names/prices
- 3 warehouses:
  - San Francisco (37.7749, -122.4194)
  - New York City (40.7128, -74.0060)
  - Austin (30.2672, -97.7431)
- Inventory: 50-150 units of each product at each warehouse

### 11. Docker Configuration

**Dockerfile**

- Base: `node:18-alpine`
- Working directory setup
- Copy package files, install dependencies
- Copy source, build TypeScript
- Expose port 3000
- Start command: `node dist/server.js`

**docker-compose.yml**

- `api` service: builds from Dockerfile, depends on `postgres`
- `postgres` service: PostgreSQL 15-alpine
- Environment: `DATABASE_URL=postgres://postgres:postgres@db:5432/canals`
- Volumes for postgres data
- Port mapping: 3000:3000

### 12. README.md

- Quick start: `docker compose up --build`
- Local dev instructions (optional)
- Example curl commands for:
  - Creating an order
  - Testing geocoding mock
  - Testing payment mock
- Design decisions section:
  - Why Express (simplicity, ecosystem)
  - Why in-memory distance calculation (no external API needed, fast)
  - Why transaction-based inventory updates (ACID guarantees, prevents race conditions)

## Key Implementation Details

### Transaction Safety

- Use `prisma.$transaction()` for order creation
- Inventory decrement uses `updateMany` with `quantity >= required`
- Check `count` of affected rows - if 0, throw error (rollback)
- Ensures atomicity and prevents overselling

### Error Handling

- 400: Invalid input, out of stock
- 402: Payment failed
- 500: Internal server errors
- All errors return `{ error: "message" }` format

### Type Safety

- Strict TypeScript throughout
- Proper Prisma types for models
- Request/response DTOs where needed

## Files to Create

1. `package.json` - Dependencies and scripts
2. `tsconfig.json` - TypeScript configuration
3. `.env.example` - Environment variables template
4. `.gitignore` - Git ignore rules
5. `prisma/schema.prisma` - Database schema
6. `prisma/seed.ts` - Seed data
7. `src/db/prisma.ts` - Prisma client
8. `src/utils/distance.ts` - Haversine calculation
9. `src/mocks/geocodingMock.ts` - Geocoding mock endpoint
10. `src/mocks/paymentMock.ts` - Payment mock endpoint
11. `src/services/productService.ts` - Product operations
12. `src/services/warehouseService.ts` - Warehouse selection
13. `src/services/orderService.ts` - Order creation logic
14. `src/controllers/orderController.ts` - Order endpoint
15. `src/app.ts` - Express app setup
16. `src/server.ts` - Server entry point
17. `Dockerfile` - Docker image definition
18. `docker-compose.yml` - Docker Compose configuration
19. `README.md` - Documentation

Total: 19 files to create