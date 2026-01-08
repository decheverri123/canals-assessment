// Jest setup file for test configuration
import { PrismaClient } from '@prisma/client';

// Global test setup
beforeAll(async () => {
  // Setup test database connection if needed
});

afterAll(async () => {
  // Cleanup test database connection if needed
});

// Mock external services for testing
jest.mock('../services/GeocodingService');
jest.mock('../services/PaymentService');