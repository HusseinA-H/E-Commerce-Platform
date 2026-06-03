import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { cleanJsonString } from '../../ai/utils/json-cleaner';

export interface CustomerSegmentAdvice {
  userId: string;
  userName: string;
  email: string;
  segment: 'VIP' | 'loyal' | 'new' | 'at-risk' | 'churn-risk';
  churnScore: number;
  retentionAdvice: string;
  lifetimeSpend: number;
}

export interface OrderFraudRisk {
  orderId: string;
  orderNumber: string;
  customerName: string;
  riskScore: number;
  abuseType:
    | 'none'
    | 'referral_abuse'
    | 'marketplace_abuse'
    | 'payment_fraud'
    | 'multiple_accounts';
  reasoning: string;
  flagged: boolean;
  createdAt: string;
}

@Injectable()
export class AiCustomerFraudService {
  private readonly logger = new Logger(AiCustomerFraudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async segmentCustomers(): Promise<CustomerSegmentAdvice[]> {
    this.logger.log(
      'Compiling RFM profiles for customer segmentation and churn analysis...',
    );

    // 1. Fetch user accounts and their orders
    const users = await this.prisma.user.findMany({
      where: { role: 'customer' },
      include: {
        orders: {
          where: { status: { not: 'cancelled' } },
        },
        loyaltyAccount: true,
      },
      take: 100, // sample limit for LLM prompt context
    });

    const userProfiles = users.map((u) => {
      const totalSpend = u.orders.reduce((sum, o) => sum + o.total, 0);
      const orderCount = u.orders.length;

      let daysSinceLastPurchase = 365; // default fallback for inactive
      if (orderCount > 0) {
        const sorted = [...u.orders].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        const lastOrderDate = sorted[0].createdAt;
        daysSinceLastPurchase = Math.floor(
          (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        userId: u.id,
        userName: u.name,
        email: u.email,
        orderCount,
        lifetimeSpend: totalSpend,
        daysSinceLastPurchase,
        loyaltyPoints: u.loyaltyAccount?.points || 0,
      };
    });

    if (userProfiles.length === 0) return [];

    try {
      const messages = [
        {
          role: 'system',
          content: `You are an elite customer analytics AI.
Segment customers based on Recency, Frequency, and Monetary (RFM) metrics.
Classify each customer into:
- VIP (high spend, high frequency, low recency)
- loyal (moderate-to-high spend, low recency)
- new (low frequency, low recency)
- at-risk (high spend but inactive for 60+ days)
- churn-risk (inactive for 120+ days)
Calculate churn probability score (0 to 100) and provide targeted retention recommendations.
You MUST return a JSON response containing an array named "customerSegments" where each item matches this schema:
{
  "userId": "string",
  "userName": "string",
  "email": "string",
  "segment": "VIP" | "loyal" | "new" | "at-risk" | "churn-risk",
  "churnScore": 0,
  "retentionAdvice": "string",
  "lifetimeSpend": 0.0
}`,
        },
        {
          role: 'user',
          content: `Here are the active customer profiles: ${JSON.stringify(userProfiles)}`,
        },
      ];

      const response = (await this.aiService.executeGroqCall(
        'llama-3.3-70b-versatile',
        messages,
        'customer_segmentation',
        { type: 'json_object' },
        0.2,
      )) as { data: { choices: { message: { content: string } }[] } };

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw customer segmentation response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      const parsed = JSON.parse(cleaned) as {
        customerSegments?: CustomerSegmentAdvice[];
      };
      return parsed.customerSegments || [];
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Customer Segmentation failed: ${errMsg}`);
      // Fallback rule-based segmentation
      return userProfiles.map((u) => {
        let segment: 'VIP' | 'loyal' | 'new' | 'at-risk' | 'churn-risk' = 'new';
        let churnScore = 15;
        let retentionAdvice =
          'Engage with onboarding coupons and product introductory mailers.';

        if (
          u.orderCount > 4 &&
          u.lifetimeSpend > 1000 &&
          u.daysSinceLastPurchase < 45
        ) {
          segment = 'VIP';
          churnScore = 5;
          retentionAdvice =
            'Extend exclusive early-access to new arrivals and offer personalized stylist concierge services.';
        } else if (u.orderCount > 2 && u.daysSinceLastPurchase < 60) {
          segment = 'loyal';
          churnScore = 20;
          retentionAdvice =
            'Provide tier loyalty point bonuses and seasonal rewards.';
        } else if (u.daysSinceLastPurchase > 120) {
          segment = 'churn-risk';
          churnScore = 85;
          retentionAdvice =
            'Deploy high-value win-back promotions (e.g. 25% off checkout coupon) and re-engagement campaigns.';
        } else if (u.daysSinceLastPurchase > 60) {
          segment = 'at-risk';
          churnScore = 60;
          retentionAdvice =
            'Trigger automated cart recovery or stock alert email for previously viewed apparel.';
        }

        return {
          userId: u.userId,
          userName: u.userName,
          email: u.email,
          segment,
          churnScore,
          retentionAdvice,
          lifetimeSpend: u.lifetimeSpend,
        };
      });
    }
  }

  async auditFraudRisk(): Promise<OrderFraudRisk[]> {
    this.logger.log(
      'Querying active transactions logs for fraud and abuse scoring audit...',
    );

    // 1. Fetch recent orders
    const orders = await this.prisma.order.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // audit sample
    });

    // 2. Fetch referral relationships to scan for referral loops
    const referralEvents = await this.prisma.referralEvent.findMany({
      include: {
        referralCode: true,
        referrer: { select: { email: true } },
        referred: { select: { email: true } },
      },
    });

    const referralGroup = referralEvents.map((e) => ({
      referrer: e.referrer.email,
      referred: e.referred.email,
      status: e.status,
      createdAt: e.createdAt,
    }));

    const orderData = orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.user?.name || 'Guest',
      email: o.user?.email || 'N/A',
      amount: o.total,
      country: o.shippingAddress?.country || 'US',
      city: o.shippingAddress?.city || 'N/A',
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));

    if (orderData.length === 0) return [];

    try {
      const messages = [
        {
          role: 'system',
          content: `You are an elite e-commerce fraud and financial compliance investigator AI.
Scan recent orders and referral relationships for fraud indicators:
1. Referral Abuse: Referrers sharing email domains or looping claims (e.g. A refers B, B refers A).
2. Marketplace Abuse: Suspicious ordering velocity or size anomalies.
3. Payment Fraud: Unusually high-ticket transactions with pending payment states or mismatching destinations.
For each audited order, yield a fraud riskScore (0 to 100), flag reason, and abuse type.
You MUST return a JSON response containing an array named "fraudLog" where each item matches this schema:
{
  "orderId": "string",
  "orderNumber": "string",
  "customerName": "string",
  "riskScore": 0,
  "abuseType": "none" | "referral_abuse" | "marketplace_abuse" | "payment_fraud" | "multiple_accounts",
  "reasoning": "string",
  "flagged": false,
  "createdAt": "string"
}`,
        },
        {
          role: 'user',
          content: `Here are the order transaction details: ${JSON.stringify(orderData)}
Referral relationships: ${JSON.stringify(referralGroup)}`,
        },
      ];

      const response = (await this.aiService.executeGroqCall(
        'llama-3.3-70b-versatile',
        messages,
        'fraud_compliance_audit',
        { type: 'json_object' },
        0.2,
      )) as { data: { choices: { message: { content: string } }[] } };

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw fraud audit response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      const parsed = JSON.parse(cleaned) as {
        fraudLog?: OrderFraudRisk[];
      };
      return parsed.fraudLog || [];
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Fraud Detection scan failed: ${errMsg}`);
      // Fallback rule-based risk logging
      return orderData.map((o) => {
        let riskScore = 10;
        let abuseType: OrderFraudRisk['abuseType'] = 'none';
        let reasoning =
          'Order verified with standard scoring. Low risk signature.';
        let flagged = false;

        // Check if referral abuse detected (e.g. self referrals sharing email domains)
        const referrerAbusing = referralGroup.some(
          (ref) =>
            ref.referred.toLowerCase() === o.email.toLowerCase() &&
            ref.referrer.split('@')[1] === ref.referred.split('@')[1],
        );

        if (referrerAbusing) {
          riskScore = 75;
          abuseType = 'referral_abuse';
          reasoning =
            'Shared email domain flagged between referrer and invitee. Self-referral loop suspected.';
          flagged = true;
        } else if (o.amount > 2000 && o.paymentStatus !== 'paid') {
          riskScore = 65;
          abuseType = 'payment_fraud';
          reasoning =
            'High ticket checkout total. High pricing margin verification pending.';
          flagged = true;
        }

        return {
          orderId: o.orderId,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          riskScore,
          abuseType,
          reasoning,
          flagged,
          createdAt: o.createdAt.toISOString(),
        };
      });
    }
  }
}
