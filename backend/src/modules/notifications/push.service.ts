import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private isConfigured = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const serviceAccountJson = this.configService.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    try {
      if (serviceAccountJson) {
        const credentials = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(credentials),
        });
        this.isConfigured = true;
        this.logger.log(
          'Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON.',
        );
      } else if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.isConfigured = true;
        this.logger.log('Firebase Admin initialized via env variables.');
      } else {
        this.logger.warn(
          'Firebase Admin credentials not found. Push notifications will run in mock (dry-run) mode.',
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize Firebase Admin: ${error.message}`,
      );
    }
  }

  async registerToken(userId: string, token: string, deviceType: string) {
    return this.prisma.userDeviceToken.upsert({
      where: { token },
      update: { userId, deviceType, updatedAt: new Date() },
      create: { userId, token, deviceType },
    });
  }

  async unregisterToken(token: string) {
    return this.prisma.userDeviceToken.deleteMany({
      where: { token },
    });
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    notificationType: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const pref = await this.prisma.notificationPreference.findFirst({
      where: { userId, channel: 'push', type: notificationType },
    });

    if (pref && !pref.isEnabled) {
      this.logger.log(
        `Push notifications for ${notificationType} disabled by user ${userId}`,
      );
      return;
    }

    const tokens = await this.prisma.userDeviceToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) {
      this.logger.log(`No active device tokens found for user ${userId}`);
      return;
    }

    const tokenStrings = tokens.map((t) => t.token);

    if (!this.isConfigured) {
      this.logger.log(
        `[PUSH MOCK] To User: ${userId} | Tokens: ${tokenStrings.join(', ')} | Title: ${title} | Body: ${body} | Data: ${JSON.stringify(data)}`,
      );
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: tokenStrings,
      notification: { title, body },
      data,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Multicast push sent: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );

      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const code = resp.error.code;
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokenStrings[idx]);
            }
          }
        });

        if (tokensToRemove.length > 0) {
          await this.prisma.userDeviceToken.deleteMany({
            where: { token: { in: tokensToRemove } },
          });
          this.logger.log(
            `Cleaned up ${tokensToRemove.length} inactive device tokens.`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`Error sending push notification: ${error.message}`);
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.log(
        `[PUSH MOCK] To Topic: ${topic} | Title: ${title} | Body: ${body} | Data: ${JSON.stringify(data)}`,
      );
      return;
    }

    const message: admin.messaging.TopicMessage = {
      topic,
      notification: { title, body },
      data,
    };

    try {
      await admin.messaging().send(message);
      this.logger.log(`Push notification sent to topic: ${topic}`);
    } catch (error: any) {
      this.logger.error(
        `Error sending topic push notification: ${error.message}`,
      );
    }
  }
}
