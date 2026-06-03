import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { validateEnv } from './config/env.validation';

// Infrastructure Modules
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { MailModule } from './modules/mail/mail.module';

// Business Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AiModule } from './modules/ai/ai.module';
import { AiStylistModule } from './modules/ai-stylist/ai-stylist.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { HealthModule } from './modules/health/health.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PersonalizationModule } from './modules/personalization/personalization.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { QueuesDashboardModule } from './modules/admin/queues-dashboard.module';
import { SearchModule } from './modules/search/search.module';
// Phase G — Retention, Loyalty & Growth
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ReferralModule } from './modules/referral/referral.module';
import { RetentionModule } from './modules/retention/retention.module';

// Phase H — Mobile, PWA & Omnichannel Commerce
import { QrModule } from './modules/qr/qr.module';
import { MobileAnalyticsModule } from './modules/mobile-analytics/mobile-analytics.module';
import { SocialCommerceModule } from './modules/social-commerce/social-commerce.module';

// Phase I — Global Commerce Infrastructure
import { GlobalCommerceModule } from './modules/global-commerce/global-commerce.module';

// Phase J — Advanced AI Commerce Intelligence
import { AiIntelligenceModule } from './modules/global-commerce/ai-intelligence.module';

// Phase K — Multi-Tenant SaaS
import { SaaSModule } from './modules/saas/saas.module';
import { TenantMiddleware } from './modules/saas/tenant.middleware';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),

    // Global Rate Limiter
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: (Number(config.get<number>('THROTTLER_TTL')) || 60) * 1000,
          limit: Number(config.get<number>('THROTTLER_LIMIT')) || 1000,
        },
      ],
    }),

    // Global Database & Utilities
    PrismaModule,
    RedisModule,
    CloudinaryModule,
    MailModule,

    // Background Job Processing
    // lazyConnect + enableOfflineQueue:false prevents BullMQ from crashing
    // the process when Redis is temporarily unavailable at startup.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          // Resilience options — do not crash when Redis is offline
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 5000,
          maxRetriesPerRequest: null, // Required by BullMQ
          retryStrategy: (times: number) => {
            if (times > 5) return null; // Give up after 5 retries
            return Math.min(times * 500, 5000);
          },
        },
      }),
    }),

    // Auth & Users
    AuthModule,
    UsersModule,

    // Catalog & Session Store
    ProductsModule,
    CategoriesModule,
    CartModule,
    WishlistModule,
    CouponsModule,
    ReviewsModule,

    // Order checkout & Stripe
    OrdersModule,
    PaymentsModule,

    // AI & Dashboards
    AiModule,
    AiStylistModule,
    RecommendationsModule,
    AdminModule,
    AnalyticsModule,
    NotificationsModule,
    PersonalizationModule,

    // Stripe Ecosystem
    StripeModule,
    WebhooksModule,
    SubscriptionsModule,
    VendorModule,

    // Infrastructure monitoring
    HealthModule,
    RealtimeModule,
    QueuesDashboardModule,

    // Phase F — Search, Discovery & AI Retrieval
    SearchModule,

    // Phase G — Retention, Loyalty & Growth
    LoyaltyModule,
    ReferralModule,
    RetentionModule,

    // Phase H — Mobile, PWA & Omnichannel Commerce
    QrModule,
    MobileAnalyticsModule,
    SocialCommerceModule,

    // Phase I — Global Commerce Infrastructure
    GlobalCommerceModule,

    // Phase J — Advanced AI Commerce Intelligence
    AiIntelligenceModule,

    // Phase K — Multi-Tenant SaaS
    SaaSModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
