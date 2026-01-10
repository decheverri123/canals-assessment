-- Create a separate test database for Jest tests
-- This prevents tests from affecting the main production/development database

CREATE DATABASE canals_test_db;

-- Grant privileges to the main user
GRANT ALL PRIVILEGES ON DATABASE canals_test_db TO canals_user;
