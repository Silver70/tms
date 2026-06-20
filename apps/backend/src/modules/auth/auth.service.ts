import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { jwtConfig } from '../../config/jwt.config';
import { durationToMs } from '../../shared/utils/duration';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserWithRole } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenRepository } from './refresh-token.repository';

const BCRYPT_ROUNDS = 12;

export interface AuthResult {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // access token lifetime, in seconds
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.createVisitor({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithRole(dto.email);
    // Generic message — never reveal whether the email is registered.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    return this.issueTokens(user);
  }

  async refresh(rawToken: string): Promise<AuthResult> {
    const stored = await this.refreshTokenRepo.findActiveByHash(
      this.hashToken(rawToken),
    );
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: revoke the presented token before issuing a new pair.
    await this.refreshTokenRepo.revoke(stored.id);

    const user = await this.usersService.findByIdWithRole(stored.userId);
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    return this.issueTokens(user);
  }

  async logout(userId: number): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
  }

  private async issueTokens(user: UserWithRole): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    const rawRefresh = randomBytes(32).toString('hex');
    await this.refreshTokenRepo.create(
      user.id,
      this.hashToken(rawRefresh),
      new Date(Date.now() + durationToMs(this.config.refreshExpires)),
    );

    return {
      user: new UserResponseDto(user),
      accessToken,
      refreshToken: rawRefresh,
      tokenType: 'Bearer',
      expiresIn: Math.floor(durationToMs(this.config.accessExpires) / 1000),
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
