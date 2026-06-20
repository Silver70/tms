import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  // Optional: browsers send the refresh token via httpOnly cookie. Non-browser
  // clients may still pass it in the body.
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
