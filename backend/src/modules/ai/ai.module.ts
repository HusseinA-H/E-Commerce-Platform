import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { AiProcessor } from './ai.processor';
import { AiTelemetryService } from './ai-telemetry.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'ai-catalog',
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiProcessor, AiTelemetryService],
  exports: [AiService, AiTelemetryService],
})
export class AiModule {}
