import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const totalUsers = await this.prisma.user.count({
      where: { role: 'customer' },
    });
    const totalProducts = await this.prisma.product.count();

    // Total revenue from paid orders
    const paidOrders = await this.prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: { total: true },
    });
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    const pendingOrdersCount = await this.prisma.order.count({
      where: { status: 'pending' },
    });
    const processingOrdersCount = await this.prisma.order.count({
      where: { status: 'processing' },
    });

    // Recent orders log
    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Alert thresholds (low stock products)
    const lowStockProducts = await this.prisma.product.findMany({
      where: { stock: { lte: 5 } },
      select: { id: true, name: true, stock: true },
    });

    return {
      metrics: {
        totalUsers,
        totalProducts,
        totalRevenue,
        pendingOrdersCount,
        processingOrdersCount,
        lowStockAlertsCount: lowStockProducts.length,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.user.name,
        customerEmail: o.user.email,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
      })),
      lowStockProducts,
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return this.prisma.user.delete({ where: { id: userId } });
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActivityFeed() {
    // 1. Fetch recent audit logs
    const auditLogs = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

    // 2. Fetch recent refunds
    const refunds = await this.prisma.refund.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { orderNumber: true } } },
    });

    // 3. Fetch recent orders
    const newOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });

    const feed: any[] = [];

    auditLogs.forEach((log) => {
      let detailsObj = {};
      try {
        detailsObj = log.details ? JSON.parse(log.details) : {};
      } catch {
        detailsObj = { raw: log.details };
      }
      feed.push({
        id: log.id,
        type: 'admin_action',
        title: log.action,
        description: `Entity ${log.entityType} (${log.entityId || 'N/A'}) was modified by ${log.user?.name || 'System'}.`,
        metadata: detailsObj,
        createdAt: log.createdAt,
      });
    });

    refunds.forEach((ref) => {
      feed.push({
        id: ref.id,
        type: 'refund',
        title: 'Refund Processed',
        description: `Refund of $${ref.amount.toFixed(2)} processed for order ${ref.order?.orderNumber || 'N/A'}. Status: ${ref.status}.`,
        metadata: { reason: ref.reason },
        createdAt: ref.createdAt,
      });
    });

    newOrders.forEach((ord) => {
      feed.push({
        id: ord.id,
        type: 'new_order',
        title: 'New Order Received',
        description: `Order ${ord.orderNumber} placed by ${ord.user?.name || 'Guest'}. Total: $${ord.total.toFixed(2)}.`,
        metadata: { paymentStatus: ord.paymentStatus, status: ord.status },
        createdAt: ord.createdAt,
      });
    });

    return feed
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 15);
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
      take: 200,
    });
  }
}
