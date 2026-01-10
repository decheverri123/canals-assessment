/**
 * Jest global setup
 * Creates and configures the test database before all tests run
 */

import { execSync } from "child_process";

export default async function globalSetup() {
  // Set test database URL - use a separate database for tests
  const baseUrl = process.env.DATABASE_URL || "postgresql://canals_user:canals_password@localhost:5432/canals_db";
  const testDbUrl = baseUrl.includes("canals_test_db") 
    ? baseUrl 
    : baseUrl.replace(/\/[^/]+$/, "/canals_test_db");
  
  process.env.DATABASE_URL = testDbUrl;
  
  // Push schema to test database
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });
    console.log("Test database schema pushed successfully");
  } catch (error) {
    console.error("Failed to push schema to test database:", error);
    throw error;
  }
}
