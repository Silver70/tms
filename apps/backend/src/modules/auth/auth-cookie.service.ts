import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { appConfig } from '../../config/app.config';
import { jwtConfig } from '../../config/jwt.config';
import { durationToMs } from '../../shared/utils/duration';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/**
 * Sets/clears the httpOnly auth cookies. On localhost the cookie is host-scoped
 * (port-agnostic) and `:3000`↔`:4000` are same-site, so `SameSite=Lax` is sent
 * on the frontend's requests. In production (cross-domain) switch to
 * `SameSite=None; Secure` or serve both apps under one domain.
 */
@Injectable()
export class AuthCookieService {
  constructor(
    @Inject(jwtConfig.KEY) private readonly jwt: ConfigType<typeof jwtConfig>,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  set(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...this.base(),
      maxAge: durationToMs(this.jwt.accessExpires),
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.base(),
      maxAge: durationToMs(this.jwt.refreshExpires),
    });
  }

  clear(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.base());
    res.clearCookie(REFRESH_COOKIE, this.base());
  }

  private base(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.app.environment === 'production',
      path: '/',
    };
  }
}
