import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'vortex-compression-shirt-v2' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  size: string;

  @ApiProperty({ example: 'Onyx Black' })
  @IsString()
  color: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}
