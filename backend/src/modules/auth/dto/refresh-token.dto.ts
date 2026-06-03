import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    example: 'some-refresh-token-string',
    description: 'The current active refresh token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
