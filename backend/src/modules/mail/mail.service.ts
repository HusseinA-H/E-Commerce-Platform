import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// ─── Shared email layout ──────────────────────────────────────────────────────
const emailWrapper = (content: string) => `
  <div style="background-color:#0b0b0b;color:#f4f4f0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;">
    <!-- Header -->
    <div style="background-color:#111111;padding:32px 40px;border-bottom:1px solid #1e1e1e;text-align:center;">
      <h1 style="color:#ffffff;letter-spacing:6px;font-size:20px;margin:0;font-weight:300;">APEX LUXE</h1>
      <p style="color:#d4ff3f;font-size:9px;letter-spacing:4px;margin:6px 0 0;">PREMIUM ATHLETIC FASHION</p>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background-color:#0a0a0a;padding:24px 40px;border-top:1px solid #1e1e1e;text-align:center;">
      <p style="color:#3c3f40;font-size:11px;margin:0;">© ${new Date().getFullYear()} APEX LUXE. All rights reserved.</p>
      <p style="color:#3c3f40;font-size:10px;margin:6px 0 0;">You are receiving this email because you are an APEX LUXE member.</p>
    </div>
  </div>
`;

const ctaButton = (url: string, label: string) =>
  `<div style="text-align:center;margin:32px 0;">
    <a href="${url}" style="background-color:#d4ff3f;color:#0b0b0b;padding:14px 32px;text-decoration:none;font-weight:bold;letter-spacing:3px;font-size:11px;display:inline-block;">${label}</a>
  </div>`;

const heading = (text: string) =>
  `<h2 style="color:#ffffff;font-size:22px;font-weight:300;letter-spacing:2px;margin:0 0 16px;">${text}</h2>`;

const body = (text: string) =>
  `<p style="color:#a5a7ab;font-size:14px;line-height:1.7;margin:0 0 16px;">${text}</p>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0;">`;

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;
  private fromAddress = 'noreply@apexluxe.com';
  private resendApiKey: string | null = null;
  private resendFromEmail = 'aha-hussein.me';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') || null;
    this.resendFromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'aha-hussein.me';

    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');
    this.fromAddress =
      this.configService.get<string>('MAIL_FROM') || 'noreply@apexluxe.com';

    if (this.resendApiKey) {
      this.isConfigured = true;
      this.logger.log('Resend API key detected — emails will route through Resend HTTP API.');
    } else if (host && port && user && pass && !user.startsWith('mock')) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: { user, pass },
      });
      this.isConfigured = true;
      this.logger.log('Nodemailer SMTP transport successfully configured.');
    } else {
      this.logger.warn('SMTP/Resend not configured — emails will log to console.');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (this.resendApiKey) {
      try {
        const fromDomain = this.resendFromEmail || 'aha-hussein.me';
        const fromEmail = fromDomain.includes('@')
          ? fromDomain
          : `APEX LUXE <noreply@${fromDomain}>`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to,
            subject,
            html,
          }),
        });

        const data = await response.json() as any;
        if (response.ok) {
          this.logger.log(`Email sent via Resend API → ${to} | ${subject} (ID: ${data.id})`);
        } else {
          this.logger.error(`Resend API dispatch failed → ${to}: ${JSON.stringify(data)}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`Resend API failed → ${to}: ${msg}`);
      }
      return;
    }

    if (!this.isConfigured || !this.transporter) {
      this.logger.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Email failed → ${to}: ${msg}`);
    }
  }

  // ─── Auth Emails ─────────────────────────────────────────────────────────

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `http://localhost:3000/auth/verify-email?token=${token}`;
    await this.send(
      email,
      'APEX LUXE — Verify Your Account',
      emailWrapper(
        heading('Verify Your Email') +
          body(
            'Welcome to the circle. Please verify your account to activate your profile.',
          ) +
          ctaButton(url, 'VERIFY EMAIL') +
          body(
            '<span style="font-size:11px;color:#555;">If you did not create this account, you can safely ignore this email.</span>',
          ),
      ),
    );
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const url = `http://localhost:3000/auth/reset-password?token=${token}`;
    await this.send(
      email,
      'APEX LUXE — Reset Password',
      emailWrapper(
        heading('Password Reset Request') +
          body(
            'You requested a password reset. Tap below to choose a new password. This link expires in 1 hour.',
          ) +
          ctaButton(url, 'RESET PASSWORD') +
          body(
            '<span style="font-size:11px;color:#555;">If you did not request this, please secure your account immediately.</span>',
          ),
      ),
    );
  }

  // ─── G.6 Automated Email Templates ────────────────────────────────────────

  /** Welcome email sent on registration */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.send(
      email,
      'Welcome to APEX LUXE',
      emailWrapper(
        heading(`Welcome, ${name}.`) +
          body(
            "You've joined an exclusive community of performance-driven individuals who demand both excellence and aesthetics. Your journey with APEX LUXE begins now.",
          ) +
          divider() +
          body(
            'Explore our curated catalog, build your style DNA, and discover pieces engineered for those who push limits.',
          ) +
          ctaButton('http://localhost:3000/shop', 'EXPLORE THE COLLECTION') +
          body(
            '<span style="font-size:11px;color:#555;">Your first purchase earns you 50 loyalty points. Earn more with every order.</span>',
          ),
      ),
    );
  }

  /** Order confirmation email */
  async sendOrderConfirmation(
    email: string,
    name: string,
    order: any,
  ): Promise<void> {
    const itemsHtml = (order.items || [])
      .map(
        (item: any) =>
          `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#a5a7ab;font-size:13px;">${item.productName || item.product?.name || 'Product'}</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#ffffff;font-size:13px;text-align:right;">$${(item.price || 0).toFixed(2)} × ${item.quantity}</td>
        </tr>`,
      )
      .join('');

    await this.send(
      email,
      `APEX LUXE — Order Confirmed #${order.id?.slice(-8).toUpperCase() || 'N/A'}`,
      emailWrapper(
        heading('Order Confirmed') +
          body(
            `Thank you, ${name}. Your order has been confirmed and is being prepared with care.`,
          ) +
          divider() +
          `<table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>` +
          divider() +
          `<div style="text-align:right;color:#ffffff;font-size:16px;font-weight:bold;">Total: $${(order.total || 0).toFixed(2)}</div>` +
          ctaButton(
            `http://localhost:3000/tracking/${order.id}`,
            'TRACK ORDER',
          ),
      ),
    );
  }

  /** Shipping update email */
  async sendShippingUpdate(
    email: string,
    name: string,
    order: any,
    trackingNumber: string,
  ): Promise<void> {
    await this.send(
      email,
      'APEX LUXE — Your Order Has Shipped',
      emailWrapper(
        heading('Your Order Is On Its Way') +
          body(
            `Good news, ${name}. Your APEX LUXE order has been dispatched and is heading your way.`,
          ) +
          divider() +
          `<div style="background:#111;border:1px solid #1e1e1e;padding:20px;text-align:center;margin:16px 0;">
          <p style="color:#a5a7ab;font-size:11px;letter-spacing:2px;margin:0 0 8px;">TRACKING NUMBER</p>
          <p style="color:#d4ff3f;font-size:18px;font-weight:bold;letter-spacing:4px;margin:0;">${trackingNumber}</p>
        </div>` +
          ctaButton(
            `http://localhost:3000/tracking/${order.id}`,
            'TRACK YOUR ORDER',
          ),
      ),
    );
  }

  /** Delivered email */
  async sendDeliveredEmail(
    email: string,
    name: string,
    order: any,
  ): Promise<void> {
    await this.send(
      email,
      'APEX LUXE — Your Order Has Been Delivered',
      emailWrapper(
        heading('Delivered. Enjoy.') +
          body(
            `${name}, your APEX LUXE order has been delivered. We hope it exceeds every expectation.`,
          ) +
          divider() +
          body(
            "If everything looks perfect, we'd love to hear from you. Leave a review to earn loyalty points.",
          ) +
          ctaButton(`http://localhost:3000/profile`, 'LEAVE A REVIEW'),
      ),
    );
  }

  /** Abandoned cart recovery email with AI-generated message */
  async sendAbandonedCartEmail(
    email: string,
    name: string,
    cartItems: any[],
    aiMessage: string,
  ): Promise<void> {
    const itemsHtml = cartItems
      .slice(0, 4)
      .map(
        (item: any) =>
          `<div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #1e1e1e;">
            <div style="flex:1;color:#a5a7ab;font-size:13px;">${item.product?.name || 'Product'} <span style="color:#555;font-size:11px;">${item.size} · ${item.color}</span></div>
            <div style="color:#ffffff;font-size:13px;">$${(item.product?.price || 0).toFixed(2)} × ${item.quantity}</div>
          </div>`,
      )
      .join('');

    await this.send(
      email,
      'APEX LUXE — Your Cart Is Waiting',
      emailWrapper(
        heading('Still thinking it over?') +
          `<p style="color:#d4ff3f;font-size:14px;line-height:1.7;margin:0 0 24px;font-style:italic;">"${aiMessage}"</p>` +
          divider() +
          itemsHtml +
          divider() +
          ctaButton('http://localhost:3000/cart', 'COMPLETE YOUR ORDER') +
          body(
            '<span style="font-size:11px;color:#555;">Your cart is saved. Return anytime to complete your purchase.</span>',
          ),
      ),
    );
  }

  /** Wishlist restock notification email */
  async sendWishlistRestockEmail(
    email: string,
    name: string,
    product: any,
  ): Promise<void> {
    await this.send(
      email,
      `APEX LUXE — ${product.name} Is Back In Stock`,
      emailWrapper(
        heading('Back In Stock') +
          body(
            `${name}, great news — a product from your wishlist is back in stock.`,
          ) +
          divider() +
          `<div style="background:#111;border:1px solid #1e1e1e;padding:20px;margin:16px 0;">
          <p style="color:#ffffff;font-size:15px;font-weight:bold;margin:0 0 6px;">${product.name}</p>
          <p style="color:#d4ff3f;font-size:16px;font-weight:bold;margin:0;">$${(product.price || 0).toFixed(2)}</p>
        </div>` +
          body('Act fast — popular items sell out quickly.') +
          ctaButton(
            `http://localhost:3000/product/${product.slug || product.id}`,
            'SHOP NOW',
          ),
      ),
    );
  }

  /** Price drop alert email */
  async sendPriceDropEmail(
    email: string,
    name: string,
    product: any,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    const saving = (oldPrice - newPrice).toFixed(2);
    await this.send(
      email,
      `APEX LUXE — Price Drop: ${product.name}`,
      emailWrapper(
        heading('Price Drop Alert') +
          body(`${name}, a product on your wishlist just dropped in price.`) +
          divider() +
          `<div style="background:#111;border:1px solid #1e1e1e;padding:20px;margin:16px 0;">
          <p style="color:#ffffff;font-size:15px;font-weight:bold;margin:0 0 8px;">${product.name}</p>
          <p style="margin:0;">
            <span style="color:#555;font-size:13px;text-decoration:line-through;">Was $${oldPrice.toFixed(2)}</span>
            <span style="color:#d4ff3f;font-size:20px;font-weight:bold;margin-left:12px;">Now $${newPrice.toFixed(2)}</span>
          </p>
          <p style="color:#a5a7ab;font-size:12px;margin:8px 0 0;">You save $${saving}</p>
        </div>` +
          ctaButton(
            `http://localhost:3000/product/${product.slug || product.id}`,
            'SHOP NOW',
          ),
      ),
    );
  }

  /** Generic omnichannel notification email */
  async sendGenericNotification(
    email: string,
    name: string,
    title: string,
    content: string,
  ): Promise<void> {
    await this.send(
      email,
      `APEX LUXE — ${title}`,
      emailWrapper(
        heading(title) +
          body(`Hello ${name || 'Valued Member'},`) +
          body(content) +
          ctaButton('http://localhost:3000/profile', 'VIEW NOTIFICATIONS'),
      ),
    );
  }

  /** Loyalty points/tier notification email */
  async sendLoyaltyNotification(
    email: string,
    name: string,
    pointsEarned: number,
    totalPoints: number,
    tier: string,
    reason: string,
  ): Promise<void> {
    const changeText = pointsEarned >= 0 ? `+${pointsEarned}` : `${pointsEarned}`;
    await this.send(
      email,
      `APEX LUXE — Loyalty Points Update (${changeText})`,
      emailWrapper(
        heading('Loyalty Points Updated') +
          body(`Hello ${name},`) +
          body(`Your loyalty account has been updated: **${changeText} points** for *${reason}*.`) +
          divider() +
          `<div style="background:#111;border:1px solid #1e1e1e;padding:24px;text-align:center;margin:16px 0;">
            <div style="display:inline-block;width:45%;text-align:center;border-right:1px solid #1e1e1e;vertical-align:middle;">
              <p style="color:#a5a7ab;font-size:11px;letter-spacing:2px;margin:0 0 6px;">TOTAL BALANCE</p>
              <p style="color:#d4ff3f;font-size:24px;font-weight:bold;letter-spacing:2px;margin:0;">${totalPoints}</p>
            </div>
            <div style="display:inline-block;width:45%;text-align:center;vertical-align:middle;">
              <p style="color:#a5a7ab;font-size:11px;letter-spacing:2px;margin:0 0 6px;">CURRENT TIER</p>
              <p style="color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:2px;margin:0;text-transform:uppercase;">${tier}</p>
            </div>
          </div>` +
          body('Unlock exclusive rewards, private drops, and complimentary shipping with higher tiers.') +
          ctaButton('http://localhost:3000/profile', 'VIEW MY ACCOUNT'),
      ),
    );
  }

  /** Referral notification email */
  async sendReferralNotification(
    email: string,
    name: string,
    refereeName: string,
    rewardDescription: string,
  ): Promise<void> {
    await this.send(
      email,
      `APEX LUXE — Successful Referral Reward`,
      emailWrapper(
        heading('Referral Successful') +
          body(`Hello ${name},`) +
          body(`Your friend, **${refereeName}**, has successfully joined and completed their first purchase using your referral code.`) +
          divider() +
          `<div style="background:#111;border:1px solid #1e1e1e;padding:20px;text-align:center;margin:16px 0;">
            <p style="color:#a5a7ab;font-size:11px;letter-spacing:2px;margin:0 0 8px;">YOUR REWARD</p>
            <p style="color:#d4ff3f;font-size:18px;font-weight:bold;letter-spacing:2px;margin:0;">${rewardDescription}</p>
          </div>` +
          body('Thank you for spreading the word and growing the APEX LUXE circle. Keep sharing your link to earn more rewards.') +
          ctaButton('http://localhost:3000/profile', 'GET MY REFERRAL LINK'),
      ),
    );
  }
}
