import { Role } from '../enums/role.enum';

/**
 * The shape attached to `request.user` by `JwtStrategy.validate()`.
 * Intentionally minimal and free of sensitive fields.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
}
