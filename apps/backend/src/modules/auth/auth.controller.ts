import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthCookieService, REFRESH_COOKIE } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

interface SessionResponse {
  user: UserResponseDto;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.register(dto);
    this.cookies.set(res, result);
    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.login(dto);
    this.cookies.set(res, result);
    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const result = await this.authService.refresh(
      this.extractRefresh(req, dto),
    );
    this.cookies.set(res, result);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(user.id);
    this.cookies.clear(res);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return new UserResponseDto(
      await this.usersService.findByIdWithRole(user.id),
    );
  }

  /** Prefer the httpOnly cookie; fall back to a body token for non-browser clients. */
  private extractRefresh(req: Request, dto: RefreshTokenDto): string {
    const cookies = req.cookies as Record<string, string | undefined>;
    const token = cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }
    return token;
  }
}
