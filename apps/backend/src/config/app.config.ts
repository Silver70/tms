import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  environment: process.env.NODE_ENV ?? 'development',
}));

export type AppConfig = ReturnType<typeof appConfig>;
