import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminQueuesAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    let token = '';

    // 1. From Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7);
    } else {
      // 2. From Cookies (typical for direct browser URL navigation)
      const isProd =
        this.configService.get<string>('NODE_ENV') === 'production';
      const cookieName = isProd ? '__Host-accessToken' : 'accessToken';

      const rawCookies = req.headers.cookie || '';
      const cookies: Record<string, string> = {};
      rawCookies.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        if (parts.length === 2) {
          cookies[parts[0].trim()] = parts[1].trim();
        }
      });
      token = cookies[cookieName] || '';
    }

    if (!token) {
      res
        .status(401)
        .send(
          '<h1>401 Unauthorized</h1><p>APEX Admin Access Token Missing</p>',
        );
      return;
    }

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'default_secret';
      const payload = this.jwtService.verify(token, { secret });

      if (payload.role !== 'admin') {
        res
          .status(403)
          .send('<h1>403 Forbidden</h1><p>APEX Admin Privileges Required</p>');
        return;
      }

      next();
    } catch (e: any) {
      res
        .status(401)
        .send(
          `<h1>401 Unauthorized</h1><p>Authentication Failed: ${e.message}</p>`,
        );
    }
  }
}
