import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  path: process.env.DATABASE_PATH ?? './data/dev.db',
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
