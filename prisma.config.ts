import { defineConfig, env } from '@prisma/config';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dbname';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
