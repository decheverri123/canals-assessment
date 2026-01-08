# Canals Backend Assessment

Order Management System with Express, Prisma, and PostgreSQL.

## Prerequisites

- Node.js (LTS version)
- pnpm
- Docker and Docker Compose

## Setup Instructions

### Option 1: Run Everything with Docker (Recommended)

1. **Start PostgreSQL and the app:**
   ```bash
   docker-compose up -d
   ```

2. **Run database migrations:**
   ```bash
   docker-compose exec app pnpm prisma migrate deploy
   ```

3. **Seed the database:**
   ```bash
   docker-compose exec app pnpm prisma:seed
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f app
   ```

The API will be available at `http://localhost:3000`

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

- **Payment failure test:** Use amount = 9999 cents to trigger payment failure
- **Warehouse selection:** Test with orders requiring different warehouses
- **Split shipment error:** Try ordering items that exist in different warehouses
