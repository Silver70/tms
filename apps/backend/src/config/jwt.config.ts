import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET as string,
  accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  issuer: process.env.JWT_ISSUER ?? 'booking-system',
  audience: process.env.JWT_AUDIENCE ?? 'booking-system-clients',
}));

export type JwtConfig = ReturnType<typeof jwtConfig>;
