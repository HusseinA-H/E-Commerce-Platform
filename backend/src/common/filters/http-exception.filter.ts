import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  private logError(message: string, stack?: string, metadata?: any) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      this.logger.error(
        JSON.stringify({ level: 'error', message, stack, ...metadata }),
      );
    } else {
      this.logger.error(message, stack);
    }
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      if (typeof resContent === 'object' && resContent !== null) {
        const resObj = resContent as Record<string, unknown>;
        message =
          typeof resObj.message === 'string' || Array.isArray(resObj.message)
            ? (resObj.message as string | string[])
            : JSON.stringify(resObj);
        error =
          typeof resObj.error === 'string' ? resObj.error : 'HttpException';
      } else {
        message = String(resContent);
        error = 'HttpException';
      }
    } else {
      const err = exception as Record<string, unknown> | null | undefined;
      const errMsg =
        err && typeof err.message === 'string'
          ? err.message
          : String(exception);
      const errStack =
        err && typeof err.stack === 'string' ? err.stack : undefined;
      const prismaCode = err && typeof err.code === 'string' ? err.code : null;

      // ─── Prisma Error Code Mapping ──────────────────────────────────────────
      if (prismaCode) {
        switch (prismaCode) {
          case 'P2002':
            // Unique constraint violation
            status = HttpStatus.CONFLICT;
            message = 'A record with this value already exists.';
            error = 'Conflict';
            break;

          case 'P2003':
            // Foreign key constraint violation
            status = HttpStatus.BAD_REQUEST;
            message = 'Related record not found. Check referenced IDs.';
            error = 'Bad Request';
            break;

          case 'P2025':
            // Record not found (e.g. update/delete on non-existent record)
            status = HttpStatus.NOT_FOUND;
            message = 'The requested record was not found.';
            error = 'Not Found';
            break;

          case 'P2016':
            // Query interpretation error
            status = HttpStatus.BAD_REQUEST;
            message = 'Invalid query parameters provided.';
            error = 'Bad Request';
            break;

          case 'P1001':
            // Cannot reach database server
            status = HttpStatus.SERVICE_UNAVAILABLE;
            message = 'Database server is unreachable. Try again later.';
            error = 'Service Unavailable';
            this.logError(
              `Database connectivity error (P1001): ${errMsg}`,
              errStack,
              { prismaCode, path: request.url },
            );
            break;

          default:
            // Log unhandled Prisma codes at error level
            this.logError(
              `Unhandled Prisma error (${prismaCode}): ${errMsg}`,
              errStack,
              { prismaCode, path: request.url },
            );
        }
      } else {
        // Non-Prisma unhandled exceptions
        this.logError(`Unhandled exception: ${errMsg}`, errStack, {
          path: request.url,
        });
      }
    }

    response.status(status).json({
      statusCode: status,
      error,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
