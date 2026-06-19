import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DRIZZLE } from './drizzle.constants';
import * as schema from './schema';

export const databaseProvider: Provider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const path = config.get<string>('database.path') ?? './data/dev.db';
    mkdirSync(dirname(path), { recursive: true });

    const sqlite = new Database(path);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    return drizzle(sqlite, { schema });
  },
};
