import { Global, Module } from '@nestjs/common';
import { databaseProvider } from './database.provider';
import { DRIZZLE } from './drizzle.constants';

@Global()
@Module({
  providers: [databaseProvider],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
