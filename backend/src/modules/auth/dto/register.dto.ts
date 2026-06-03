import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'alex@mercer.com',
    description: "The user's unique email address",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'A secure password of minimum 6 characters',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Alex Mercer', description: "The user's full name" })
  @IsString()
  @MinLength(2)
  name: string;
}
