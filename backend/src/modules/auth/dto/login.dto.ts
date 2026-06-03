import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'alex@mercer.com',
    description: 'The registered user email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'The account password' })
  @IsString()
  @MinLength(6)
  password: string;
}
