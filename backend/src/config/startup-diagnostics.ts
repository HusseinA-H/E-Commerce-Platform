import { Logger } from '@nestjs/common';

const logger = new Logger('Startup');

/**
 * Logs a structured startup diagnostic block to confirm the server has
 * loaded the correct configuration. Call this after app.listen().
 */
export function logStartupDiagnostics(port: number | string): void {
  const env = process.env.NODE_ENV || 'development';
  const nodeVersion = process.version;

  // Parse DB host safely from the connection string
  let dbHost = 'unknown';
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const match = dbUrl.match(/sqlserver:\/\/([^:;]+)/);
    if (match?.[1]) dbHost = match[1];
  } catch {
    // ignore parse errors
  }

  const redisHost = process.env.REDIS_HOST || 'unknown';
  const redisPort = process.env.REDIS_PORT || '6379';
  const redisAuth = process.env.REDIS_PASSWORD
    ? '✓ password set'
    : '⚠ no password';

  logger.log('──────────────────────────────────────────────');
  logger.log(`  APEX LUXE Backend — Ready`);
  logger.log(`  Environment  : ${env}`);
  logger.log(`  Node.js      : ${nodeVersion}`);
  logger.log(`  Port         : ${port}`);
  logger.log(`  Database     : sqlserver://${dbHost}:1433`);
  logger.log(`  Redis        : ${redisHost}:${redisPort} (${redisAuth})`);
  logger.log(`  API Docs     : http://localhost:${port}/api/docs`);
  logger.log('──────────────────────────────────────────────');
}
