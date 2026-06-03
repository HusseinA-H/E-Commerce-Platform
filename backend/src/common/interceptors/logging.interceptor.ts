import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] ?? 'unknown';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse<Response>();
        const delay = Date.now() - now;
        const statusCode = response.statusCode;

        const isProd = process.env.NODE_ENV === 'production';

        if (isProd) {
          const logObj = { method, url, statusCode, delayMs: delay, ip };
          const logStr = JSON.stringify(logObj);
          if (statusCode >= 400 && statusCode < 500) {
            this.logger.warn(logStr);
          } else {
            this.logger.log(logStr);
          }
        } else {
          // Log 4xx responses at warn level in dev
          if (statusCode >= 400 && statusCode < 500) {
            this.logger.warn(
              `${method} ${url} ${statusCode} — ${delay}ms [${ip}]`,
            );
          } else {
            this.logger.log(
              `${method} ${url} ${statusCode} — ${delay}ms [${ip}]`,
            );
          }
          // Suppress noisy user-agent logging in production
          this.logger.debug(`User-Agent: ${userAgent}`);
        }
      }),
      catchError((err: unknown) => {
        const delay = Date.now() - now;
        const status =
          err && typeof err === 'object' && 'status' in err
            ? (err as { status: number }).status
            : 500;

        const isProd = process.env.NODE_ENV === 'production';
        const errMsg = err instanceof Error ? err.message : String(err);

        if (isProd) {
          this.logger.error(
            JSON.stringify({
              level: 'error',
              method,
              url,
              status,
              delayMs: delay,
              ip,
              error: errMsg,
            }),
          );
        } else {
          this.logger.error(
            `${method} ${url} ${status} — ${delay}ms [${ip}] — ${errMsg}`,
          );
        }

        return throwError(() => err);
      }),
    );
  }
}
