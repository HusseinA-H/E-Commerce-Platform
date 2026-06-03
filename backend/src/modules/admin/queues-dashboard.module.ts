import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminQueuesAuthMiddleware } from './queues-auth.middleware';

const queues = [
  'ai-catalog',
  'stripe-webhooks',
  'emails',
  'recommendations',
  'analytics',
  'inventory',
  'payouts',
  'notifications',
  'abandoned-cart',
  'ai-insights',
];

@Module({
  imports: [
    // Register the BullMQ queues in NestJS context
    ...queues.map((q) =>
      BullModule.registerQueue({
        name: q,
      }),
    ),

    // Setup Bull-Board dashboard route
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),

    // Bind each queue to Bull-Board panel
    ...queues.map((q) =>
      BullBoardModule.forFeature({
        name: q,
        adapter: BullMQAdapter,
      }),
    ),

    // JWT verification dependencies
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_secret',
      }),
    }),
  ],
})
export class QueuesDashboardModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Protect `/admin/queues` path with admin authorization checks
    consumer.apply(AdminQueuesAuthMiddleware).forRoutes('/admin/queues');
  }
}
