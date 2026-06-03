import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue('stripe-webhooks') private readonly webhooksQueue: Queue,
  ) {}

  /**
   * Dispatches the verified webhook event into the BullMQ processing queue.
   */
  async dispatchEvent(event: any) {
    // Add job to the queue with retry logic
    await this.webhooksQueue.add('process-stripe-event', event, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s, 8s, 16s
      },
      jobId: event.id, // Idempotency check: event.id guarantees it's only queued once successfully
    });

    this.logger.log(
      `Dispatched webhook event ${event.type} to BullMQ [JobId: ${event.id}]`,
    );
  }
}
