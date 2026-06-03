import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Alex Mercer',
    description: "The user's display name",
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;
}
