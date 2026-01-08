/**
 * Jest test setup and teardown configuration
 * Handles database connection, cleanup, and global test utilities
 */

import { PrismaClient } from "@prisma/client";

/**
 * Prisma client instance for tests
 * Uses a separate instance to avoid conflicts with the main app
 */
export const testPrisma = new PrismaClient({
  log: process.env.DEBUG ? ["query", "error", "warn"] : [],
});

/**
 * Database connection/disconnection
 */
export async function connectTestDatabase(): Promise<void> {
  try {
    await testPrisma.$connect();
    if (process.env.DEBUG) {
      console.log("Test database connected successfully");
    }
  } catch (error) {
    console.error("Failed to connect to test database:", error);
    throw error;
  }
}

export async function disconnectTestDatabase(): Promise<void> {
  try {
    await testPrisma.$disconnect();
    if (process.env.DEBUG) {
      console.log("Test database disconnected successfully");
    }
  } catch (error) {
    console.error("Failed to disconnect from test database:", error);
    throw error;
  }
}

/**
 * Clean up test database by truncating all tables
 * This ensures test isolation between test suites
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Delete in order to respect foreign key constraints
    await testPrisma.orderItem.deleteMany();
    await testPrisma.order.deleteMany();
    await testPrisma.inventory.deleteMany();
    await testPrisma.product.deleteMany();
    await testPrisma.warehouse.deleteMany();
  } catch (error) {
    console.error("Failed to cleanup test database:", error);
    throw error;
  }
}

/**
 * Global setup: Connect to database before all tests
 */
beforeAll(async () => {
  await connectTestDatabase();
});

/**
 * Global teardown: Disconnect from database after all tests
 */
afterAll(async () => {
  await disconnectTestDatabase();
});

/**
 * Cleanup before each test
 * This ensures each test starts with a clean database
 * Note: This runs before EVERY test, not just before each test file
 */
beforeEach(async () => {
  await cleanupTestDatabase();
});
