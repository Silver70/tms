import { Role } from '../../../shared/enums/role.enum';

/** Minimal, non-sensitive JWT access-token payload. */
export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
