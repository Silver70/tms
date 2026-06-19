import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const path = process.env.DATABASE_PATH ?? './data/dev.db';
mkdirSync(dirname(path), { recursive: true });

const sqlite = new Database(path);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: './src/shared/database/migrations' });
console.log(`✅ Migrations applied to ${path}`);

sqlite.close();
