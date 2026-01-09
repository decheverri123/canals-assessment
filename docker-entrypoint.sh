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
set +e  # Temporarily disable exit on error for seed
pnpm prisma:seed
SEED_EXIT_CODE=$?
set -e  # Re-enable exit on error

if [ $SEED_EXIT_CODE -eq 0 ]; then
  echo "✓ Database seeded successfully"
else
  echo "⚠ Warning: Seed command exited with code $SEED_EXIT_CODE"
  echo "The application will still start. You can manually seed later with:"
  echo "  docker exec canals-app pnpm prisma db seed"
fi

echo "Starting application..."
exec "$@"
