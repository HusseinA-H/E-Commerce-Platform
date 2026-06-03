import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'vortex-compression-shirt-v2' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 5, description: 'Rating score from 1 to 5' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Outstanding Quality' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    example:
      'The Vortex compression shirt fits perfectly and manages temperature amazingly.',
  })
  @IsString()
  @MinLength(10)
  comment: string;
}
