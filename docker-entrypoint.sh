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
pnpm prisma:seed || echo "Seed completed or skipped"

echo "Starting application..."
exec "$@"
