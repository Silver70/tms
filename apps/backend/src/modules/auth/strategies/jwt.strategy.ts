import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../../../config/jwt.config';
import { AuthenticatedUser } from '../../../shared/interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';
import { ACCESS_COOKIE } from '../auth-cookie.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/** Reads the access token from the httpOnly cookie, falling back to the Bearer header. */
const cookieExtractor = (req: Request): string | null => {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[ACCESS_COOKIE] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY) config: ConfigType<typeof jwtConfig>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.secret,
      ignoreExpiration: false,
      issuer: config.issuer,
      audience: config.audience,
    });
  }

  /** Re-validate against the DB on every request: user must exist and be active. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService
      .findByIdWithRole(payload.sub)
      .catch(() => null);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
