import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService } from './ai.service';

@Processor('ai-catalog')
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { productId } = job.data;
    this.logger.log(
      `Processing AI Enrichment Job: Product ID: ${productId} [JobId: ${job.id}]`,
    );

    try {
      const result = await this.aiService.enrichProduct(productId);
      this.logger.log(
        `Successfully enriched product ${productId} [JobId: ${job.id}]`,
      );
      return { status: 'success', result };
    } catch (error: any) {
      this.logger.error(
        `Failed to enrich product ${productId}: ${error.message}`,
      );
      throw error; // Propagate error for BullMQ backoff retry
    }
  }
}
