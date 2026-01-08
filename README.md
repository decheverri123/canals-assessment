# Order Management API

A backend service for order management functionality in an e-commerce platform. The system handles order creation, warehouse selection, inventory management, and integrates with external geocoding and payment services.

## Features

- RESTful API for order management
- Automatic warehouse selection based on inventory and proximity
- Integration with geocoding and payment services
- PostgreSQL database with Prisma ORM
- Docker containerization for easy deployment
- Comprehensive testing with Jest and property-based testing

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL (if running without Docker)

## Quick Start with Docker

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd order-management-api
   cp .env.example .env
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate dev
   ```

4. **Seed database (optional)**
   ```bash
   docker-compose exec app npm run prisma:seed
   ```

5. **Access the API**
   - API: http://localhost:3000
   - Health check: http://localhost:3000/health

## Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up postgres -d
   ```

3. **Setup database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with sample data

## Docker Commands

- `npm run docker:up` - Start all services
- `npm run docker:down` - Stop all services
- `docker-compose up app-dev` - Start in development mode

## API Endpoints

### Orders
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get order by ID

### Health
- `GET /health` - Health check endpoint

## Project Structure

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── models/          # TypeScript interfaces
├── middleware/      # Express middleware
└── test/           # Test utilities and setup

prisma/
├── schema.prisma   # Database schema
└── migrations/     # Database migrations
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `GEOCODING_API_URL` - Geocoding service endpoint
- `PAYMENT_API_URL` - Payment service endpoint

## Testing

The project uses Jest for unit testing and fast-check for property-based testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Database

The application uses PostgreSQL with Prisma ORM. The database schema includes:

- Orders and order items
- Warehouses and inventory
- Products
- Automatic timestamps and relationships

## Contributing

1. Follow TypeScript best practices
2. Write tests for new functionality
3. Use conventional commit messages
4. Ensure all tests pass before submitting

## License

MIT