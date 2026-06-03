import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: 'user' })
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ example: 'Recommend a compression tee' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AssistantQueryDto {
  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  messages: ChatMessageDto[];
}
