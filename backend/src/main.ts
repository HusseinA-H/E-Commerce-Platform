import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TelemetryInterceptor } from './common/interceptors/telemetry.interceptor';
import { logStartupDiagnostics } from './config/startup-diagnostics';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { ConfigService } from '@nestjs/config';
import { initSentry } from './config/sentry.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Initialize Sentry error tracking
  const configService = app.get(ConfigService);
  initSentry(configService);

  app.setGlobalPrefix('api/v1');

  // 1. Security middlewares
  app.use(
    helmet({
      hidePoweredBy: true,
      xssFilter: true,
      noSniff: true,
      frameguard: { action: 'deny' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        },
      },
    }),
  );

  app.use(cookieParser());

  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret:
        process.env.SESSION_SECRET || 'apex_luxe_oauth_session_secret_2026',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        sameSite: 'lax',
      },
    }),
  );

  // Strict Origin/Referer CSRF Protection
  app.use((req: any, res: any, next: any) => {
    const allowedMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (allowedMethods.includes(req.method)) return next();

    // Skip webhook and health endpoints from CSRF check
    if (req.path.includes('/payments/webhook') || req.path.includes('/health'))
      return next();

    const origin = req.get('origin');
    const referer = req.get('referer');
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (isProd) {
      if (!origin && !referer) {
        return res
          .status(403)
          .json({ message: 'CSRF Protection: Missing Origin/Referer' });
      }
      if (origin && !origin.startsWith(allowedOrigin)) {
        return res
          .status(403)
          .json({ message: 'CSRF Protection: Invalid Origin' });
      }
      if (referer && !referer.startsWith(allowedOrigin)) {
        return res
          .status(403)
          .json({ message: 'CSRF Protection: Invalid Referer' });
      }
    }
    next();
  });

  app.enableCors({
    origin: true, // In production, replace with specific domain list
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 2. Global application components
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TelemetryInterceptor(),
  );

  // 3. Swagger OpenAPI documentation setup
  const config = new DocumentBuilder()
    .setTitle('APEX LUXE API')
    .setDescription(
      'Enterprise-grade sportswear E-Commerce platform backend services',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 4. Start Server
  const port = process.env.PORT || 5000;
  await app.listen(port);

  logStartupDiagnostics(port);

  // 5. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (process.env.NODE_ENV === 'production') {
      logger.error(`Unhandled Rejection: ${msg}`, String(promise));
      process.exit(1);
    } else {
      // In development, transient infrastructure errors (Redis, BullMQ) can
      // surface as unhandled rejections. Log them as warnings but keep running.
      logger.warn(`[Dev] Unhandled Rejection (non-fatal): ${msg}`);
    }
  });
}

void bootstrap();
