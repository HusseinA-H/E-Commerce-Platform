import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SpecDto {
  @ApiProperty({ example: 'Material' })
  @IsString()
  key: string;

  @ApiProperty({ example: '82% Recycled Polyamide' })
  @IsString()
  value: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Vortex Compression Shirt V2' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Engineered compression shirt for elite training.' })
  @IsString()
  description: string;

  @ApiProperty({ example: 145.0 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 180.0 })
  @IsNumber()
  @IsOptional()
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: 'category-uuid-string' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isLimited?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['S', 'M', 'L'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Onyx Black', 'Volt'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['https://images.unsplash.com/photo-...'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ type: [SpecDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecDto)
  @IsOptional()
  specs?: SpecDto[];
}
