# Order Management API

A backend service for managing e-commerce orders with automatic warehouse selection and payment processing.

## Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Testing**: Jest + fast-check (property-based testing)
- **Package Manager**: pnpm
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- Docker and Docker Compose (for local development)
- PostgreSQL 16 (if running without Docker)

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in `.env` if needed.

### 3. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL database
docker-compose up -d postgres

# Run migrations
pnpm prisma:migrate

# Seed the database
pnpm prisma:seed
```

#### Option B: Using Local PostgreSQL

1. Ensure PostgreSQL is running locally
2. Update `DATABASE_URL` in `.env`
3. Run migrations: `pnpm prisma:migrate`
4. Seed the database: `pnpm prisma:seed`

### 4. Generate Prisma Client

```bash
pnpm prisma:generate
```

### 5. Start Development Server

```bash
pnpm dev
```

The server will start on `http://localhost:3000`

## Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate test coverage report
- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio
- `pnpm prisma:seed` - Seed the database
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors

## Docker Setup

### Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Project Structure

```
canals-assessment/
├── src/
│   ├── entry/              # Application entry point
│   ├── api/                 # Presentation layer (HTTP)
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   ├── services/            # Business logic layer
│   ├── repositories/        # Data access layer
│   ├── models/              # Data models/types
│   ├── infrastructure/      # IO/External services
│   └── utils/               # Shared utilities
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   └── property/
└── docker-compose.yml
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status.

### Create Order

```
POST /orders
```

Creates a new order with automatic warehouse selection and payment processing.

## Architecture

The project follows a modular architecture with strict separation of concerns:

- **Presentation Layer** (`api/`): HTTP controllers, routes, and middleware
- **Business Logic Layer** (`services/`): Core business logic and orchestration
- **Data Access Layer** (`repositories/`): Database operations
- **Infrastructure Layer** (`infrastructure/`): External service integrations
- **Models** (`models/`): TypeScript types and DTOs
- **Utilities** (`utils/`): Shared helper functions

## Testing

Run unit tests:
```bash
pnpm test
```

Run property-based tests:
```bash
pnpm test
```

Generate coverage report:
```bash
pnpm test:coverage
```

## License

ISC
