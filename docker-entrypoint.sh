#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Simple wait using pg_isready if available, otherwise let Prisma handle retries
if command -v pg_isready >/dev/null 2>&1; then
  until pg_isready -h postgres -p 5432 -U canals_user >/dev/null 2>&1; do
    echo "Waiting for database..."
    sleep 2
  done
  echo "Database is ready!"

# Create test database if it doesn't exist (for running tests in Docker)
echo "Ensuring test database exists..."
PGPASSWORD=canals_password psql -h postgres -U canals_user -d canals_db -tc "SELECT 1 FROM pg_database WHERE datname = 'canals_test_db'" | grep -q 1 || \
  PGPASSWORD=canals_password psql -h postgres -U canals_user -d canals_db -c "CREATE DATABASE canals_test_db;"
echo "Test database ready!"
else
  echo "pg_isready not available, Prisma will handle connection retries"
fi

echo "Setting up database schema..."
# Check if migrations directory exists and has content
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Migrations found, deploying..."
  pnpm prisma migrate deploy || {
    echo "Migration deploy failed, trying db push as fallback..."
    pnpm prisma db push --accept-data-loss --skip-generate
  }
else
  echo "No migrations found, pushing schema directly..."
  pnpm prisma db push --accept-data-loss --skip-generate
fi

# Regenerate Prisma client after schema changes
echo "Generating Prisma client..."
pnpm prisma:generate

echo "Seeding database..."
# Run seed - if it fails, log but don't stop container startup
# The seed script is idempotent and will clear/recreate data
# Retry seeding up to 3 times in case of transient database connection issues
set +e  # Temporarily disable exit on error for seed
MAX_RETRIES=3
RETRY_COUNT=0
SEED_EXIT_CODE=1

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ $SEED_EXIT_CODE -ne 0 ]; do
  if [ $RETRY_COUNT -gt 0 ]; then
    echo "Retrying seed (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
    sleep 2
  fi
  pnpm prisma:seed
  SEED_EXIT_CODE=$?
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

set -e  # Re-enable exit on error

if [ $SEED_EXIT_CODE -eq 0 ]; then
  echo "✓ Database seeded successfully"
else
  echo "⚠ Warning: Seed command failed after $MAX_RETRIES attempts (exit code: $SEED_EXIT_CODE)"
  echo "The application will still start. You can manually seed later with:"
  echo "  docker exec canals-app pnpm prisma db seed"
fi

echo "Starting application..."
exec "$@"
