import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RedisModule } from '../redis/redis.module';
import { AiStylistController } from './ai-stylist.controller';
import { AiStylistService } from './ai-stylist.service';
import { OutfitAnalysisService } from './outfit-analysis.service';
import { OutfitRecommendationService } from './outfit-recommendation.service';
import { PromptRegistry } from './prompt-builders/prompt-registry';
import { GroqVisionAdapter } from './interfaces/groq-vision-adapter';

@Module({
  imports: [PrismaModule, CloudinaryModule, RedisModule],
  controllers: [AiStylistController],
  providers: [
    PromptRegistry,
    GroqVisionAdapter,
    OutfitAnalysisService,
    OutfitRecommendationService,
    AiStylistService,
  ],
  exports: [
    AiStylistService,
    OutfitAnalysisService,
    OutfitRecommendationService,
  ],
})
export class AiStylistModule {}
