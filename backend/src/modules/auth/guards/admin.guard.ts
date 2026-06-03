import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied. Authentication required.');
    }

    const adminRoles = [
      'super_admin',
      'admin',
      'inventory_manager',
      'support_agent',
    ];
    if (!adminRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Access denied. Administrative privileges required.',
      );
    }

    return true;
  }
}
