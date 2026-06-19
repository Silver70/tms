import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/shared/database/schema/index.ts',
  out: './src/shared/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './data/dev.db',
  },
});
