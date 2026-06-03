import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { PersonalizationService } from './personalization.service';
import { StyleDnaService } from './style-dna.service';
import { SessionMemoryService } from './session-memory.service';
import { PersonalizationController } from './personalization.controller';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  controllers: [PersonalizationController],
  providers: [PersonalizationService, StyleDnaService, SessionMemoryService],
  exports: [PersonalizationService, StyleDnaService, SessionMemoryService],
})
export class PersonalizationModule {}
