import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MobileAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async logEvent(
    userId: string | null,
    eventType: string,
    deviceType: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.mobileAnalyticsEvent.create({
      data: {
        userId,
        eventType,
        deviceType,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  async getAggregatedMetrics() {
    const events = await this.prisma.mobileAnalyticsEvent.findMany();

    const counts = {
      pwa_install: 0,
      push_opt_in: 0,
      push_dismiss: 0,
      push_click: 0,
      mobile_conversion: 0,
    };

    const deviceBreakdown = {
      ios: 0,
      android: 0,
      web: 0,
    };

    events.forEach((ev) => {
      if (ev.eventType in counts) {
        counts[ev.eventType as keyof typeof counts]++;
      }
      if (ev.deviceType in deviceBreakdown) {
        deviceBreakdown[ev.deviceType as keyof typeof deviceBreakdown]++;
      }
    });

    return {
      totalEvents: events.length,
      counts,
      deviceBreakdown,
    };
  }
}
