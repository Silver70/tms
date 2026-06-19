import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDB = BetterSQLite3Database<typeof schema>;
