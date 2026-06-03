import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'APEX10' })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ example: '123 Elite Way' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Zurich' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Switzerland' })
  @IsString()
  country: string;

  @ApiProperty({ example: '8001' })
  @IsString()
  postalCode: string;

  @ApiProperty({ example: '+41 44 123 4567' })
  @IsString()
  phone: string;
}
