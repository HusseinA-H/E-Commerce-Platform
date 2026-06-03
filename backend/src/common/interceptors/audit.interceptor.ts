import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, user } = request;

    return next.handle().pipe(
      tap(async (data) => {
        // Only log write actions (POST, PATCH, PUT, DELETE) by authenticated users
        const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
        const hasUser = user && user.id;

        if (isWrite && hasUser) {
          try {
            let action = `${method} ${url}`;
            let entityType = 'Unknown';
            const entityId = params.id || null;

            if (url.includes('/products')) {
              entityType = 'Product';
              action =
                method === 'POST'
                  ? 'PRODUCT_CREATE'
                  : method === 'DELETE'
                    ? 'PRODUCT_ARCHIVE'
                    : 'PRODUCT_UPDATE';
              if (url.includes('/restore')) action = 'PRODUCT_RESTORE';
              if (url.includes('/featured')) action = 'PRODUCT_FEATURE_TOGGLE';
              if (url.includes('/bulk/')) action = 'PRODUCT_BULK_OPERATION';
            } else if (url.includes('/orders')) {
              entityType = 'Order';
              action = method === 'POST' ? 'ORDER_CREATE' : 'ORDER_UPDATE';
              if (url.includes('/cancel')) action = 'ORDER_CANCEL';
              if (url.includes('/refund')) action = 'ORDER_REFUND';
              if (url.includes('/tracking')) action = 'ORDER_TRACKING_REGISTER';
            } else if (url.includes('/coupons')) {
              entityType = 'Coupon';
              action = method === 'POST' ? 'COUPON_CREATE' : 'COUPON_UPDATE';
            } else if (url.includes('/users') || url.includes('/admin/users')) {
              entityType = 'User';
              action = 'USER_ROLE_UPDATE';
            }

            // Exclude passwords or sensitive data from details
            const cleanBody = { ...body };
            if (cleanBody.password) delete cleanBody.password;
            if (cleanBody.passwordHash) delete cleanBody.passwordHash;

            await this.prisma.auditLog.create({
              data: {
                userId: user.id,
                action,
                entityType,
                entityId: entityId
                  ? String(entityId)
                  : data?.id
                    ? String(data.id)
                    : null,
                details: JSON.stringify({
                  path: url,
                  payload: cleanBody,
                  result: data
                    ? { id: data.id, orderNumber: data.orderNumber }
                    : null,
                }),
              },
            });
          } catch (err) {
            console.error(`Audit logging interceptor error: ${err}`);
          }
        }
      }),
    );
  }
}
