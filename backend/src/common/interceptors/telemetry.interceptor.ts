import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as client from 'prom-client';

// Initialize Prometheus default metrics collection if not already active
client.collectDefaultMetrics({ register: client.register });

// 1. Counter for HTTP Request totals
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by APEX LUXE.',
  labelNames: ['method', 'route', 'status_code'],
});

// 2. Histogram for HTTP Latency/Durations
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Latency of HTTP requests in seconds.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10], // customized buckets
});

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();
    const res = httpContext.getResponse();

    const start = process.hrtime();
    const { method, route, url } = req;
    const routePath = route?.path || url || 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(method, routePath, res.statusCode, start);
        },
        error: (err: any) => {
          const statusCode = err.status || err.statusCode || 500;
          this.recordMetrics(method, routePath, statusCode, start);
        },
      }),
    );
  }

  private recordMetrics(
    method: string,
    route: string,
    statusCode: number,
    start: [number, number],
  ) {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9; // convert to seconds

    const cleanRoute = route.replace(/\/\d+/g, '/:id'); // normalize numeric IDs

    // Record metrics in Prometheus registry
    httpRequestsTotal.inc({
      method,
      route: cleanRoute,
      status_code: statusCode.toString(),
    });

    httpRequestDurationSeconds.observe(
      {
        method,
        route: cleanRoute,
        status_code: statusCode.toString(),
      },
      duration,
    );
  }
}
