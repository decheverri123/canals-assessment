import { defineConfig } from '@prisma/client/generator-build'

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})