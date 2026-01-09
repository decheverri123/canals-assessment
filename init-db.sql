-- Initialize database with any required extensions or initial data
-- This file is executed when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- Enable any required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";