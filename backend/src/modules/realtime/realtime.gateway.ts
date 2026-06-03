import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Realtime WebSocket Gateway initialized successfully.');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `Connection rejected: Missing credentials from client ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      const jwtSecret =
        this.configService.get<string>('JWT_SECRET') || 'default_secret';
      const payload = this.jwtService.verify(token, { secret: jwtSecret });

      if (!payload || !payload.sub) {
        this.logger.warn(
          `Connection rejected: Invalid JWT payload from client ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      // Assign details to client
      const userId = payload.sub;
      client.data = {
        userId,
        email: payload.email,
        role: payload.role,
      };

      // Scope user room
      await client.join(`user:${userId}`);
      this.logger.log(
        `Client ${client.id} (User: ${userId}) connected & joined room: user:${userId}`,
      );

      // Scope role-based rooms
      if (payload.role === 'admin') {
        await client.join('admin');
        this.logger.log(`Client ${client.id} joined 'admin' room.`);
      }

      // Check if they are a vendor
      const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
      if (vendor) {
        client.data.vendorId = vendor.id;
        await client.join(`vendor:${vendor.id}`);
        await client.join('vendor');
        this.logger.log(
          `Client ${client.id} joined rooms: vendor, vendor:${vendor.id}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Connection authentication failure: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Client disconnected: ${client.id} (User: ${client.data?.userId || 'anonymous'})`,
    );
  }

  /**
   * Helper to extract access token from handshake
   */
  private extractToken(client: Socket): string | null {
    // 1. From handshake auth (preferred for SPA clients)
    if (client.handshake.auth?.token) {
      return this.cleanToken(client.handshake.auth.token);
    }

    // 2. From handshake headers Authorization
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      return this.cleanToken(authHeader.substring(7));
    }

    // 3. From cookies
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const isProd =
        this.configService.get<string>('NODE_ENV') === 'production';
      const cookieName = isProd ? '__Host-accessToken' : 'accessToken';
      const cookies = this.parseCookies(cookieHeader);
      if (cookies[cookieName]) {
        return cookies[cookieName];
      }
    }

    return null;
  }

  private cleanToken(token: string): string {
    return token.replace(/['"]/g, '').trim();
  }

  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieString.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      if (parts.length === 2) {
        cookies[parts[0].trim()] = parts[1].trim();
      }
    });
    return cookies;
  }

  // --- Broadcasting API Helpers ---

  /**
   * Emits event to a specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emits event to a specific vendor
   */
  sendToVendor(vendorId: string, event: string, data: any) {
    this.server.to(`vendor:${vendorId}`).emit(event, data);
  }

  /**
   * Emits event to all admins
   */
  sendToAdmin(event: string, data: any) {
    this.server.to('admin').emit(event, data);
  }

  /**
   * Emits to all active vendors
   */
  sendToAllVendors(event: string, data: any) {
    this.server.to('vendor').emit(event, data);
  }

  /**
   * Broadcasts to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
