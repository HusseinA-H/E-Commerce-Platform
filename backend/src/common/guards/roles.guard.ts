import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function hasRoleAccess(
  userRole: string,
  requiredRoles: string[],
): boolean {
  // super_admin always has access to everything
  if (userRole === 'super_admin') {
    return true;
  }

  // admin has access to anything requiring admin, inventory_manager, support_agent, or customer
  if (userRole === 'admin') {
    const allowed = ['admin', 'inventory_manager', 'support_agent', 'customer'];
    return requiredRoles.some((r) => allowed.includes(r));
  }

  // inventory_manager has access to inventory_manager and customer
  if (userRole === 'inventory_manager') {
    const allowed = ['inventory_manager', 'customer'];
    return requiredRoles.some((r) => allowed.includes(r));
  }

  // support_agent has access to support_agent and customer
  if (userRole === 'support_agent') {
    const allowed = ['support_agent', 'customer'];
    return requiredRoles.some((r) => allowed.includes(r));
  }

  // customer has access to customer only
  if (userRole === 'customer') {
    return requiredRoles.includes('customer');
  }

  return false;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied. Authentication required.');
    }

    const hasAccess = hasRoleAccess(user.role, requiredRoles);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied. Insufficient permissions.');
    }

    return true;
  }
}
