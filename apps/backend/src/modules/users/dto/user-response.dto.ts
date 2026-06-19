import { UserWithRole } from '../users.repository';

/**
 * Safe public shape of a user. Fields are assigned explicitly so the
 * password hash can never leak, regardless of serializer configuration.
 */
export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;

  constructor(user: UserWithRole) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
  }
}
