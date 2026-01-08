# Use Node.js LTS as base image
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

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

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 3000

# Start server (migrations should be run separately before starting)
CMD ["pnpm", "start"]
