import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'some-random-uuid-reset-token',
    description: 'The password reset token sent via email',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'The new password for the account',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
