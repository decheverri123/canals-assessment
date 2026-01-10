/**
 * Jest global teardown
 * Cleanup after all tests complete
 */

export default async function globalTeardown() {
  // Nothing to clean up - test database persists for debugging if needed
  // Production database remains untouched
  console.log("Test cleanup completed");
}
