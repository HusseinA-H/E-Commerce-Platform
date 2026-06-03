import * as Sentry from '@sentry/nestjs';
import { ConfigService } from '@nestjs/config';

/**
 * Initializes the Sentry Node SDK for NestJS.
 */
export function initSentry(configService: ConfigService) {
  const dsn = configService.get<string>('SENTRY_DSN');
  const env = configService.get<string>('NODE_ENV') || 'development';

  if (!dsn || dsn === 'mock' || dsn.includes('placeholder')) {
    console.log(
      'APEX Sentry Tracking: DSN not configured or set to mock. Errors will print to stdout.',
    );
    return;
  }

  Sentry.init({
    dsn,
    environment: env,
    // Enable performance tracing
    tracesSampleRate: env === 'production' ? 0.2 : 1.0,
  });

  console.log(
    `APEX Sentry Tracking: SDK initialized successfully for environment [${env}].`,
  );
}
