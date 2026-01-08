# Use Node.js LTS full image (better Prisma compatibility than slim)
FROM node:20 AS base

# Install pnpm and postgresql-client
# Full node image includes OpenSSL libraries needed by Prisma
RUN npm install -g pnpm && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN pnpm prisma:generate

# Copy source code (includes docker-entrypoint.sh)
COPY . .

# Make entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 3000

# Use entrypoint to handle migrations and seeding
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["pnpm", "start"]
