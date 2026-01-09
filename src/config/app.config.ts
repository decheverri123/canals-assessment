/**
 * Application configuration
 */

/**
 * App configuration interface
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
}

/**
 * Get application configuration from environment variables
 */
export function getAppConfig(): AppConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL || '';

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    port,
    nodeEnv,
    databaseUrl,
  };
}
